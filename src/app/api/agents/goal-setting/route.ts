import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { runGoalSettingAgent } from "@/lib/agents/goal-setting";

/**
 * POST — Trigger the goal-setting agent for a jar.
 * Body: { jarId: string }
 *
 * The agent will analyze member history, propose a goal,
 * and post to the jar feed. Members still need to approve.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jarId } = body;

    if (!jarId) {
      return NextResponse.json({ error: "Missing jarId" }, { status: 400 });
    }

    // Verify user is in the jar's group
    const jar = await db.jar.findUnique({
      where: { id: jarId },
      include: { group: { include: { members: true } } },
    });

    if (!jar) {
      return NextResponse.json({ error: "Jar not found" }, { status: 404 });
    }

    const isMember = jar.group.members.some((m) => m.userId === authUser.id);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // Run the goal-setting agent
    const result = await runGoalSettingAgent(jarId);

    return NextResponse.json({
      goal: result.goal,
      feedMessage: result.feedMessage,
    });
  } catch (error) {
    console.error("Goal-setting agent error:", error);
    return NextResponse.json({ error: "Agent error" }, { status: 500 });
  }
}
