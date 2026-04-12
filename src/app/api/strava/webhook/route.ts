import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getValidStravaToken, getStravaActivity } from "@/lib/strava";
import { buildGroupContext, buildSystemPrompt } from "@/lib/agents/personality";
import { notifyBuddy } from "@/lib/agents/tools/sms-tools";

/**
 * GET — Strava webhook verification (subscription validation).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.STRAVA_VERIFY_TOKEN &&
    challenge
  ) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST — Handle Strava activity events.
 * Auto-mints marbles in all active WORKOUT jars the user belongs to.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Only process new activities
    if (body.object_type !== "activity" || body.aspect_type !== "create") {
      return NextResponse.json({ ok: true });
    }

    const athleteId = String(body.owner_id);
    const stravaActivityId = body.object_id as number;

    // Find the user by Strava athlete ID
    const user = await db.user.findFirst({
      where: { stravaAthleteId: athleteId },
    });

    if (!user || !user.stravaToken || !user.stravaRefresh) {
      console.warn(`No user found for Strava athlete ${athleteId}`);
      return NextResponse.json({ ok: true });
    }

    // Get a valid access token (refresh if needed)
    const tokens = await getValidStravaToken(
      user.stravaToken,
      user.stravaRefresh
    );

    // If token was rotated, persist the new tokens
    if (tokens.accessToken !== user.stravaToken) {
      await db.user.update({
        where: { id: user.id },
        data: {
          stravaToken: tokens.accessToken,
          stravaRefresh: tokens.refreshToken,
        },
      });
    }

    // Fetch the activity details from Strava
    const activity = await getStravaActivity(
      tokens.accessToken,
      stravaActivityId
    );

    // Extract dayDate from the activity's local start time — don't parse through Date constructor
    const startDateLocal = activity.start_date_local as string;
    const dayDate = startDateLocal.slice(0, 10);

    // Find ALL active WORKOUT jars the user is in (across all groups)
    const memberships = await db.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);

    const activeWorkoutJars = await db.jar.findMany({
      where: {
        groupId: { in: groupIds },
        category: "WORKOUT",
        status: "ACTIVE",
      },
    });

    // For each jar: create Activity + mint Marble (skip duplicates)
    for (const jar of activeWorkoutJars) {
      try {
        // Create Activity record — Strava is a trusted source, so auto-confirm.
        // Use composite stravaActivityId to maintain uniqueness across jars.
        const activityRecord = await db.activity.create({
          data: {
            userId: user.id,
            jarId: jar.id,
            source: "strava",
            status: "CONFIRMED",
            description: `${activity.type}: ${activity.name}`,
            stravaActivityId: `${stravaActivityId}:${jar.id}`,
          },
        });

        // Mint marble (unique constraint [jarId, userId, dayDate] prevents double-mint)
        await db.marble.create({
          data: {
            jarId: jar.id,
            userId: user.id,
            dayDate,
            source: `strava:${activityRecord.id}`,
          },
        });

        // Send personality-driven buddy notification (non-critical)
        try {
          const groupContext = await buildGroupContext(jar.groupId);
          const systemPrompt = buildSystemPrompt(groupContext);

          const anthropic = new Anthropic();
          const msgResponse = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 256,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content:
                  `Craft a 2-3 sentence buddy notification about this Strava activity: ` +
                  `${user.name} just did "${activity.type}: ${activity.name}". ` +
                  `Be specific, use their name, and reference something from the favorites pot if possible. ` +
                  `Reply with ONLY the notification text, nothing else.`,
              },
            ],
          });

          const textBlock = msgResponse.content.find(
            (b): b is Anthropic.TextBlock => b.type === "text"
          );
          if (textBlock) {
            await notifyBuddy(user.id, jar.id, textBlock.text);
          }
        } catch (notifyErr) {
          console.error("Buddy notification failed (non-critical):", notifyErr);
        }
      } catch (err: unknown) {
        // Unique constraint violation = already minted for this jar+user+day — skip
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "P2002"
        ) {
          continue;
        }
        throw err;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Strava webhook error:", error);
    // Return 200 to avoid Strava retries on processing errors
    return NextResponse.json({ ok: true });
  }
}
