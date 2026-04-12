import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const VALID_EMOJIS = ["🔥", "💪", "❤️", "🎉", "😤"];

/**
 * POST — Toggle a reaction on a marble.
 * Body: { marbleId: string, emoji: string }
 * If the reaction exists, removes it. If not, creates it.
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
    const { marbleId, emoji } = body;

    if (!marbleId || !emoji) {
      return NextResponse.json({ error: "Missing marbleId or emoji" }, { status: 400 });
    }

    if (!VALID_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }

    // Check if reaction already exists
    const existing = await db.reaction.findUnique({
      where: {
        marbleId_userId_emoji: {
          marbleId,
          userId: authUser.id,
          emoji,
        },
      },
    });

    if (existing) {
      // Toggle off — remove the reaction
      await db.reaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed", emoji, marbleId });
    }

    // Toggle on — create the reaction
    await db.reaction.create({
      data: {
        marbleId,
        userId: authUser.id,
        emoji,
      },
    });

    return NextResponse.json({ action: "added", emoji, marbleId });
  } catch (error) {
    console.error("Reaction error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
