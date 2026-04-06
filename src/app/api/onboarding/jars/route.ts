import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { JarCategory } from "@/generated/prisma/enums";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, jars } = await request.json();

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(jars) || jars.length === 0) {
      return NextResponse.json(
        { error: "Add at least one jar" },
        { status: 400 }
      );
    }

    // Verify user is a member of the group
    const membership = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You're not a member of this group" },
        { status: 403 }
      );
    }

    // Create all jars and update onboarding step
    await db.$transaction([
      ...jars.map(
        (jar: {
          category: string;
          treatDescription: string;
          capacity: number;
          goalDescription?: string;
        }) =>
          db.jar.create({
            data: {
              groupId,
              category: jar.category as JarCategory,
              treatDescription: jar.treatDescription,
              capacity: jar.capacity || 60,
              goalDescription: jar.goalDescription || null,
              status: "PENDING",
            },
          })
      ),
      db.user.update({
        where: { id: user.id },
        data: { onboardingStep: 7 },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Jars onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
