import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { buildGroupContext, buildSystemPrompt } from "./personality";

const anthropic = new Anthropic();
const AGENT_MODEL = "claude-sonnet-4-20250514";

/**
 * Run the weekly hype agent for all active jars.
 * For each jar, generates a personalized weekly check-in message
 * using the personality engine and posts it to the jar's feed.
 *
 * Designed to run on Monday mornings via a cron trigger.
 */
export async function runWeeklyHypeAgent(): Promise<{
  jarCount: number;
  results: { jarId: string; groupName: string; message: string }[];
  errors: string[];
}> {
  const activeJars = await db.jar.findMany({
    where: { status: "ACTIVE" },
    include: {
      group: {
        include: {
          members: { include: { user: true } },
        },
      },
    },
  });

  const results: { jarId: string; groupName: string; message: string }[] = [];
  const errors: string[] = [];

  for (const jar of activeJars) {
    try {
      // Build full personality context for this group
      const context = await buildGroupContext(jar.group.id);
      const systemPrompt = buildSystemPrompt(context);

      // Get jar stats for the prompt
      const totalMarbles = await db.marble.count({ where: { jarId: jar.id } });
      const fillPct =
        jar.capacity > 0 ? Math.round((totalMarbles / jar.capacity) * 100) : 0;

      // Last 7 days of marbles
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekMarbles = await db.marble.findMany({
        where: {
          jarId: jar.id,
          earnedAt: { gte: weekAgo },
        },
        include: { user: true },
      });

      // Per-member weekly count
      const weeklyByMember = new Map<string, number>();
      for (const m of weekMarbles) {
        const name = m.user.name;
        weeklyByMember.set(name, (weeklyByMember.get(name) || 0) + 1);
      }

      const memberSummary = jar.group.members
        .map((gm) => {
          const count = weeklyByMember.get(gm.user.name) || 0;
          return `${gm.user.name}: ${count} marble${count !== 1 ? "s" : ""} this week`;
        })
        .join("\n");

      const userPrompt = `Write a weekly Monday check-in message for the ${jar.group.name} group's ${jar.category.toLowerCase()} jar.

Jar stats:
- ${totalMarbles}/${jar.capacity} marbles (${fillPct}% full)
- Treat: ${jar.treatDescription}
- Goal: ${jar.goalDescription || "daily " + jar.category.toLowerCase()}

This week's activity:
${memberSummary}

Total marbles this week: ${weekMarbles.length}

Write a SHORT, specific, personality-driven check-in (2-4 sentences max). 
Reference specific people and numbers. Use the cultural vocabulary from the favorites pot.
Do NOT use generic motivational language. Do NOT use the word "team."
Be the voice described in the soul document.`;

      const response = await anthropic.messages.create({
        model: AGENT_MODEL,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );

      if (textBlock?.text) {
        // Post to feed
        await db.feedPost.create({
          data: {
            jarId: jar.id,
            type: "weekly_hype",
            content: textBlock.text,
          },
        });

        results.push({
          jarId: jar.id,
          groupName: jar.group.name,
          message: textBlock.text,
        });
      }
    } catch (err) {
      console.error(`Weekly hype error for jar ${jar.id}:`, err);
      errors.push(`Jar ${jar.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return { jarCount: activeJars.length, results, errors };
}
