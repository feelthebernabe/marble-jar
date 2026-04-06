import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const origin = new URL(request.url).origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const email = data.user.email;

  // Find or create user in Prisma DB
  let user = await db.user.findUnique({ where: { email } });

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: "", // collected in onboarding
        phone: `pending_${data.user.id}`, // unique placeholder, replaced in onboarding
      },
    });
  }

  // Route based on onboarding progress
  if (user.onboardingStep >= 7) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  const step = user.onboardingStep;
  let redirectPath: string;

  if (step <= 1) {
    redirectPath = "/onboarding/marble";
  } else if (step === 2) {
    redirectPath = "/onboarding/phone";
  } else if (step === 3) {
    redirectPath = "/onboarding/favorites";
  } else if (step === 4) {
    redirectPath = "/onboarding/group";
  } else {
    // steps 5-6
    redirectPath = "/onboarding/jars";
  }

  return NextResponse.redirect(`${origin}${redirectPath}`);
}
