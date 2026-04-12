import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { approveGoal } from "@/lib/agents/tools/goal-tools";

/**
 * POST — Approve the proposed goal for a jar.
 * Body: { jarId: string }
 *
 * When all members approve, the jar automatically activates.
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

    const result = await approveGoal(jarId, authUser.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Goal approval error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
