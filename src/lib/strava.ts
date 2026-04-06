const STRAVA_OAUTH_URL = "https://www.strava.com/oauth";
const STRAVA_API_URL = "https://www.strava.com/api/v3";

const CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;

/**
 * Build the Strava OAuth authorization URL.
 */
export function getStravaAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "activity:read_all",
    approval_prompt: "auto",
  });
  return `${STRAVA_OAUTH_URL}/authorize?${params.toString()}`;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: { id: number; firstname: string; lastname: string };
}

/**
 * Exchange an authorization code for access/refresh tokens and athlete info.
 */
export async function exchangeStravaCode(
  code: string
): Promise<StravaTokenResponse> {
  const res = await fetch(`${STRAVA_OAUTH_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token exchange failed: ${res.status} ${text}`);
  }

  return res.json();
}

interface StravaRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Refresh an expired Strava access token.
 */
export async function refreshStravaToken(
  refreshToken: string
): Promise<StravaRefreshResponse> {
  const res = await fetch(`${STRAVA_OAUTH_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token refresh failed: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Return a valid access token, refreshing if the current one is expired.
 * Returns { accessToken, refreshToken, expiresAt } so the caller can
 * persist rotated tokens.
 */
export async function getValidStravaToken(
  accessToken: string,
  refreshToken: string,
  expiresAt?: number
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}> {
  const now = Math.floor(Date.now() / 1000);

  // If we have an expiresAt and it's still valid (with 60s buffer), reuse
  if (expiresAt && expiresAt > now + 60) {
    return { accessToken, refreshToken, expiresAt };
  }

  // Otherwise refresh
  const refreshed = await refreshStravaToken(refreshToken);
  return {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    expiresAt: refreshed.expires_at,
  };
}

/**
 * Fetch a single activity's details from the Strava API.
 */
export async function getStravaActivity(
  accessToken: string,
  activityId: number
): Promise<Record<string, unknown>> {
  const res = await fetch(`${STRAVA_API_URL}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava activity fetch failed: ${res.status} ${text}`);
  }

  return res.json();
}
