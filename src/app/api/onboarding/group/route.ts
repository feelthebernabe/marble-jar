import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    const inviteCode = crypto.randomBytes(4).toString("hex");

    const group = await db.group.create({
      data: {
        name: name.trim(),
        inviteCode,
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
          },
        },
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: { onboardingStep: 5 },
    });

    return NextResponse.json({ groupId: group.id, inviteCode: group.inviteCode });
  } catch (error) {
    console.error("Group creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
