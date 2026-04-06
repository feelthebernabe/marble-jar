import { NextResponse } from "next/server";
import { getStravaAuthUrl } from "@/lib/strava";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const redirectUri = `${appUrl}/api/strava/callback`;
  const authUrl = getStravaAuthUrl(redirectUri);

  return NextResponse.redirect(authUrl);
}
