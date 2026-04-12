import { NextResponse } from "next/server";
import { runWeeklyHypeAgent } from "@/lib/agents/weekly-hype";

/**
 * POST /api/agents/weekly-hype
 *
 * Cron-compatible endpoint. Triggers the weekly hype agent
 * for all active jars.
 *
 * Security: Requires a shared CRON_SECRET header to prevent
 * unauthorized triggering.
 *
 * To set up Vercel Cron, add to vercel.json:
 * { "crons": [{ "path": "/api/agents/weekly-hype", "schedule": "0 13 * * 1" }] }
 * (Monday 8am ET = 1pm UTC)
 *
 * Or manually trigger via:
 * curl -X POST https://your-app.vercel.app/api/agents/weekly-hype \
 *   -H "x-cron-secret: YOUR_SECRET"
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret (skip in development)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const providedSecret = request.headers.get("x-cron-secret");
      if (providedSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await runWeeklyHypeAgent();

    return NextResponse.json({
      success: true,
      jarsProcessed: result.jarCount,
      messagesPosted: result.results.length,
      results: result.results.map((r) => ({
        group: r.groupName,
        message: r.message.substring(0, 100) + "...",
      })),
      errors: result.errors,
    });
  } catch (error) {
    console.error("Weekly hype cron error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
