import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteCode } = await request.json();

    if (!inviteCode?.trim()) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    const group = await db.group.findUnique({
      where: { inviteCode: inviteCode.trim() },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 }
      );
    }

    // Check if already a member
    const existing = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You're already in this group" },
        { status: 409 }
      );
    }

    await db.$transaction([
      db.groupMember.create({
        data: {
          groupId: group.id,
          userId: user.id,
        },
      }),
      db.user.update({
        where: { id: user.id },
        data: { onboardingStep: 7 },
      }),
    ]);

    return NextResponse.json({ groupId: group.id });
  } catch (error) {
    console.error("Group join error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
