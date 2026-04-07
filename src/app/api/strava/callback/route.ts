import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { exchangeStravaCode } from "@/lib/strava";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (!code) {
    return NextResponse.redirect(`${appUrl}/dashboard?strava=error`);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${appUrl}/dashboard?strava=unauthorized`);
    }

    const tokens = await exchangeStravaCode(code);

    // Look up the Prisma user by email (Supabase user.id !== Prisma user.id)
    const dbUser = await db.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) {
      return NextResponse.redirect(`${appUrl}/dashboard?strava=error`);
    }

    await db.user.update({
      where: { id: dbUser.id },
      data: {
        stravaToken: tokens.access_token,
        stravaRefresh: tokens.refresh_token,
        stravaAthleteId: String(tokens.athlete.id),
        onboardingStep: Math.max(dbUser.onboardingStep, 5),
      },
    });

    // If still onboarding, continue to group step; otherwise go to dashboard
    if (dbUser.onboardingStep < 7) {
      return NextResponse.redirect(`${appUrl}/onboarding/group`);
    }
    return NextResponse.redirect(`${appUrl}/dashboard?strava=connected`);
  } catch (error) {
    console.error("Strava callback error:", error);
    return NextResponse.redirect(`${appUrl}/dashboard?strava=error`);
  }
}
