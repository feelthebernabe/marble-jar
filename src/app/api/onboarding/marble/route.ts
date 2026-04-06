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

    const { name, color, symbol } = await request.json();

    if (!name?.trim() || !color || !symbol) {
      return NextResponse.json(
        { error: "Name, color, and symbol are required" },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        name: name.trim(),
        marbleColor: color,
        marbleSymbol: symbol,
        onboardingStep: 2,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Marble onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
