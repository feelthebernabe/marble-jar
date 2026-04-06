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

    const { favorites } = await request.json();

    if (!Array.isArray(favorites) || favorites.length === 0) {
      return NextResponse.json(
        { error: "Add at least one favorite" },
        { status: 400 }
      );
    }

    // Delete existing favorites and create new ones in a transaction
    await db.$transaction([
      db.favorite.deleteMany({ where: { userId: user.id } }),
      ...favorites.map((fav: { category: string; value: string }) =>
        db.favorite.create({
          data: {
            userId: user.id,
            category: fav.category,
            value: fav.value,
          },
        })
      ),
      db.user.update({
        where: { id: user.id },
        data: { onboardingStep: 4 },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Favorites onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
