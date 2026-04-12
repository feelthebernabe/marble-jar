# Marble Jar Agents & Screens — Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the remaining two agents (goal-setting, hype) and the remaining screens (feed, celebration, profile) — completing all core features of the Marble Jar app.

**Architecture:** The goal-setting agent runs as an SMS conversation triggered when a jar enters GOAL_SETTING status. The hype agent runs autonomously via a Next.js API route called by Supabase cron, with its own memory system for running jokes and escalation tracking. The feed page shows FeedPost entries per group. The celebration screen triggers when a jar reaches capacity. The profile page shows user stats and favorites management.

**Tech Stack:** Anthropic SDK (Claude tool use), Twilio SMS, Framer Motion (celebration confetti), Next.js server components

**Spec:** `docs/superpowers/specs/2026-04-06-marble-jar-design.md`

**Scope:** Plan 3 of 4. Covers: goal-setting agent, hype agent (Level 3), feed page, celebration screen, profile page. Completes all core app features.

**Existing codebase:**
- Prisma 7 with driver adapter: `import { db } from "@/lib/db"`, types from `@/generated/prisma/client`
- Supabase server client: `import { createClient } from "@/lib/supabase/server"`
- SMS intake agent: `src/lib/agents/intake.ts` — Claude tool-use loop with personality engine
- Personality engine: `src/lib/agents/personality.ts` — `buildGroupContext()`, `buildSystemPrompt()`
- Soul doc: `src/lib/agents/soul.ts` — `SOUL_DOC` constant
- Agent tools: `src/lib/agents/tools/` — marble, SMS, favorites, image, user tools
- Twilio: `src/lib/twilio.ts` — `sendSms(to, body, mediaUrl?)`
- Timezone: `src/lib/timezone.ts` — `getUserDayDate(timezone)`
- Punk zine UI: PaperCard, ZineButton, InkInput, ProgressDots, TapeDivider
- Marble/jar components: `src/components/marble/`, `src/components/jar/`
- Shared constants: `src/lib/constants.ts` — `SYMBOL_MAP`, `getSymbolIcon()`

---

## File Structure

```
src/
  lib/
    agents/
      goal-setting.ts                  — Goal-setting agent (SMS group conversation)
      hype.ts                          — Hype agent (Level 3, autonomous, memory)
      tools/
        memory-tools.ts                — get/save agent memories
        goal-tools.ts                  — get_jar_members, set_jar_goal, get_strava_history
  app/
    api/
      agents/
        goal-setting/route.ts          — Trigger goal-setting for a jar
        hype/route.ts                  — Hype agent endpoint (called by cron)
    (app)/
      group/[id]/feed/page.tsx         — Per-group activity feed
      celebrate/[jarId]/page.tsx       — Jar completion celebration
      profile/page.tsx                 — User profile + stats + favorites
  components/
    feed/
      feed-entry.tsx                   — Single feed entry component
    celebration/
      confetti.tsx                     — Full-screen confetti animation
```

---

## Chunk 1: Goal-Setting Agent

### Task 1: Goal-Setting Tools

**Files:**
- Create: `src/lib/agents/tools/goal-tools.ts`
- Create: `src/lib/agents/tools/memory-tools.ts`

- [ ] **Step 1: Create goal-setting tools**

```typescript
// src/lib/agents/tools/goal-tools.ts
import { db } from "@/lib/db";

export async function getJarMembers(jarId: string) {
  const jar = await db.jar.findUniqueOrThrow({
    where: { id: jarId },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  stravaAthleteId: true,
                },
              },
            },
          },
        },
      },
      goalApprovals: true,
    },
  });

  return {
    jarId: jar.id,
    category: jar.category,
    groupName: jar.group.name,
    goalDescription: jar.goalDescription,
    capacity: jar.capacity,
    treatDescription: jar.treatDescription,
    members: jar.group.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      phone: m.user.phone,
      hasStrava: !!m.user.stravaAthleteId,
      hasApproved: jar.goalApprovals.some(
        (a) => a.userId === m.user.id && a.approved
      ),
    })),
  };
}

export async function setJarGoal(jarId: string, goalDescription: string) {
  // Server-side guard: verify ALL members have approved before activating
  const jar = await db.jar.findUniqueOrThrow({
    where: { id: jarId },
    include: {
      group: { include: { members: true } },
      goalApprovals: { where: { approved: true } },
    },
  });

  const allApproved = jar.group.members.every((m) =>
    jar.goalApprovals.some((a) => a.userId === m.userId)
  );

  if (!allApproved) {
    return {
      success: false,
      error: "Not all members have approved yet",
      approvalCount: jar.goalApprovals.length,
      memberCount: jar.group.members.length,
    };
  }

  // All approved — lock the goal and activate
  const updated = await db.jar.update({
    where: { id: jarId },
    data: { goalDescription, status: "ACTIVE" },
  });

  return { success: true, jarId: updated.id, goal: goalDescription, status: "ACTIVE" };
}

export async function approveGoal(jarId: string, userId: string) {
  await db.goalApproval.upsert({
    where: { jarId_userId: { jarId, userId } },
    update: { approved: true, approvedAt: new Date() },
    create: { jarId, userId, approved: true, approvedAt: new Date() },
  });

  // Check if all members have approved
  const jar = await db.jar.findUniqueOrThrow({
    where: { id: jarId },
    include: {
      group: { include: { members: true } },
      goalApprovals: { where: { approved: true } },
    },
  });

  const allApproved = jar.group.members.every((m) =>
    jar.goalApprovals.some((a) => a.userId === m.userId)
  );

  return { approved: true, allApproved, approvalCount: jar.goalApprovals.length, memberCount: jar.group.members.length };
}

export async function getActivityHistory(userId: string, weeks: number = 4) {
  // Pull recent marble data as a proxy for activity history
  // (Full Strava API history pull would require stored tokens + API calls — 
  //  for goal-setting, we use marble history as the data source)
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const marbles = await db.marble.findMany({
    where: {
      userId,
      earnedAt: { gte: since },
    },
    orderBy: { earnedAt: "desc" },
    include: {
      jar: { select: { category: true } },
    },
  });

  const activities = await db.activity.findMany({
    where: {
      userId,
      loggedAt: { gte: since },
    },
    orderBy: { loggedAt: "desc" },
    select: {
      source: true,
      description: true,
      loggedAt: true,
    },
  });

  // Summarize by week
  const weeklyData: Record<string, { workouts: number; meditations: number; other: number }> = {};
  for (const m of marbles) {
    const weekStart = getWeekStart(m.earnedAt);
    if (!weeklyData[weekStart]) weeklyData[weekStart] = { workouts: 0, meditations: 0, other: 0 };
    if (m.jar.category === "WORKOUT") weeklyData[weekStart].workouts++;
    else if (m.jar.category === "MEDITATION") weeklyData[weekStart].meditations++;
    else weeklyData[weekStart].other++;
  }

  return {
    weeklyBreakdown: Object.entries(weeklyData).map(([week, data]) => ({
      weekOf: week,
      ...data,
    })),
    recentActivities: activities.slice(0, 10).map((a) => ({
      source: a.source,
      description: a.description,
      date: a.loggedAt.toISOString().split("T")[0],
    })),
    totalMarbles: marbles.length,
    weeks,
  };
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}
```

- [ ] **Step 2: Create memory tools**

```typescript
// src/lib/agents/tools/memory-tools.ts
import { db } from "@/lib/db";

export async function getAgentMemories(groupId: string, limit: number = 20) {
  const memories = await db.agentMemory.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return memories.map((m) => ({
    id: m.id,
    type: m.type,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function saveAgentMemory(
  groupId: string,
  type: string,
  content: string
) {
  const memory = await db.agentMemory.create({
    data: { groupId, type, content },
  });
  return { id: memory.id, saved: true };
}

export async function postToFeed(
  jarId: string,
  type: string,
  content: string,
  userId?: string,
  mediaUrl?: string
) {
  const post = await db.feedPost.create({
    data: { jarId, type, content, userId, mediaUrl },
  });
  return { id: post.id, posted: true };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/tools/goal-tools.ts src/lib/agents/tools/memory-tools.ts
git commit -m "feat: add goal-setting and memory agent tools"
```

---

### Task 2: Goal-Setting Agent

**Files:**
- Create: `src/lib/agents/goal-setting.ts`
- Create: `src/app/api/agents/goal-setting/route.ts`

- [ ] **Step 1: Create the goal-setting agent**

```typescript
// src/lib/agents/goal-setting.ts
import Anthropic from "@anthropic-ai/sdk";
import { buildGroupContext, buildSystemPrompt } from "./personality";
import { getJarMembers, setJarGoal, approveGoal, getActivityHistory } from "./tools/goal-tools";
import { sendReply } from "./tools/sms-tools";
import { sendSms } from "@/lib/twilio";
import { db } from "@/lib/db";

const anthropic = new Anthropic();
const AGENT_MODEL = "claude-sonnet-4-20250514";

const goalSettingTools: Anthropic.Tool[] = [
  {
    name: "get_jar_members",
    description: "Get all members of the jar being set up, including who has approved the goal so far.",
    input_schema: { type: "object" as const, properties: { jar_id: { type: "string" } }, required: ["jar_id"] },
  },
  {
    name: "get_activity_history",
    description: "Get a member's recent activity history (from marble/activity records) to inform goal suggestions. Shows weekly breakdown. If no history exists, ask the member directly about their current practice.",
    input_schema: {
      type: "object" as const,
      properties: {
        user_id: { type: "string" },
        weeks: { type: "number", description: "How many weeks back to look (default 4)" },
      },
      required: ["user_id"],
    },
  },
  {
    name: "send_message_to_member",
    description: "Send an SMS to a specific group member. Use to ask questions, relay proposals, or share the group's discussion.",
    input_schema: {
      type: "object" as const,
      properties: {
        phone: { type: "string" },
        message: { type: "string" },
      },
      required: ["phone", "message"],
    },
  },
  {
    name: "propose_goal",
    description: "Propose a goal to the group. This sends the proposal to all members who haven't approved yet.",
    input_schema: {
      type: "object" as const,
      properties: {
        jar_id: { type: "string" },
        goal_description: { type: "string", description: "The proposed daily goal, e.g. '1 workout per day' or '10 min meditation'" },
      },
      required: ["jar_id", "goal_description"],
    },
  },
  {
    name: "record_approval",
    description: "Record a member's approval of the proposed goal. Call when someone agrees.",
    input_schema: {
      type: "object" as const,
      properties: {
        jar_id: { type: "string" },
        user_id: { type: "string" },
      },
      required: ["jar_id", "user_id"],
    },
  },
  {
    name: "lock_goal",
    description: "Lock the goal and activate the jar. Only call when ALL members have approved. After this, the jar is live and marbles can be earned.",
    input_schema: {
      type: "object" as const,
      properties: {
        jar_id: { type: "string" },
        goal_description: { type: "string" },
      },
      required: ["jar_id", "goal_description"],
    },
  },
  {
    name: "send_reply",
    description: "Reply to the person who just texted.",
    input_schema: {
      type: "object" as const,
      properties: { message: { type: "string" } },
      required: ["message"],
    },
  },
];

/**
 * Handle a message during goal-setting for a specific jar.
 */
export async function handleGoalSettingMessage(
  user: { id: string; name: string; phone: string },
  jarId: string,
  messageBody: string
) {
  const jar = await db.jar.findUniqueOrThrow({
    where: { id: jarId },
    include: { group: true },
  });

  const groupContext = await buildGroupContext(jar.groupId);
  const basePrompt = buildSystemPrompt(groupContext);

  const systemPrompt = `${basePrompt}

---

## GOAL-SETTING MODE

You are currently helping this group set a daily goal for their ${jar.category.toLowerCase()} jar.
The treat they're working toward: "${jar.treatDescription}"
Marble target: ${jar.capacity}

Your job:
1. Look at everyone's history (especially Strava data for workout jars)
2. Suggest a goal that is challenging but realistic — most people should be able to hit it most days
3. Be honest about what the data shows. Don't flatter. Don't suggest impossible goals.
4. Relay the conversation between members until everyone agrees
5. Once everyone approves, lock the goal and send a hype message

The goal should make people a little proud and a little nervous.`;

  // Load conversation history from AgentMemory (persists across SMS turns)
  const conversationMemories = await db.agentMemory.findMany({
    where: { groupId: jar.groupId, type: "goal_conversation" },
    orderBy: { createdAt: "asc" },
  });

  // Rebuild messages array from stored conversation + new message
  let messages: Anthropic.MessageParam[] = [];
  for (const mem of conversationMemories) {
    try {
      const parsed = JSON.parse(mem.content);
      messages.push(parsed);
    } catch {
      // Skip malformed entries
    }
  }
  messages.push({ role: "user", content: `[SMS from ${user.name}]: ${messageBody}` });

  const MAX_TURNS = 8;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: AGENT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: goalSettingTools,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      if (text) await sendReply(user.phone, text);
      return;
    }

    if (response.stop_reason === "tool_use") {
      const toolCalls = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const results: Anthropic.ToolResultBlockParam[] = [];

      for (const call of toolCalls) {
        const input = call.input as Record<string, unknown>;
        let result: unknown;

        switch (call.name) {
          case "get_jar_members":
            result = await getJarMembers(input.jar_id as string);
            break;
          case "get_activity_history":
            result = await getActivityHistory(input.user_id as string, (input.weeks as number) || 4);
            break;
          case "send_message_to_member":
            await sendSms(input.phone as string, input.message as string);
            result = { sent: true };
            break;
          case "propose_goal": {
            const members = await getJarMembers(input.jar_id as string);
            const unapproved = members.members.filter((m) => !m.hasApproved);
            for (const m of unapproved) {
              await sendSms(
                m.phone,
                `Goal proposal for the ${jar.category.toLowerCase()} jar: "${input.goal_description}"\n\nReply YES to approve or share your thoughts.`
              );
            }
            result = { proposed: true, sentTo: unapproved.length };
            break;
          }
          case "record_approval":
            result = await approveGoal(input.jar_id as string, input.user_id as string);
            break;
          case "lock_goal":
            result = await setJarGoal(input.jar_id as string, input.goal_description as string);
            break;
          case "send_reply":
            await sendReply(user.phone, input.message as string);
            result = { sent: true };
            break;
          default:
            result = { error: `Unknown tool: ${call.name}` };
        }

        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: JSON.stringify(result),
        });
      }

      messages = [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: results },
      ];

      // Persist conversation for cross-SMS continuity
      await db.agentMemory.create({
        data: {
          groupId: jar.groupId,
          type: "goal_conversation",
          content: JSON.stringify({ role: "assistant", content: response.content }),
        },
      });
      await db.agentMemory.create({
        data: {
          groupId: jar.groupId,
          type: "goal_conversation",
          content: JSON.stringify({ role: "user", content: results }),
        },
      });
    }
  }
}

/**
 * Start goal-setting for a jar: transition to GOAL_SETTING, create GoalApprovals, send initial message.
 */
export async function startGoalSetting(jarId: string) {
  const jar = await db.jar.update({
    where: { id: jarId },
    data: { status: "GOAL_SETTING" },
    include: {
      group: { include: { members: { include: { user: true } } } },
    },
  });

  // Create GoalApproval records for all members
  for (const member of jar.group.members) {
    await db.goalApproval.upsert({
      where: { jarId_userId: { jarId, userId: member.userId } },
      update: {},
      create: { jarId, userId: member.userId },
    });
  }

  // Send initial message to all members
  const groupContext = await buildGroupContext(jar.groupId);
  const prompt = buildSystemPrompt(groupContext);

  const anthropicClient = new Anthropic();
  const response = await anthropicClient.messages.create({
    model: AGENT_MODEL,
    max_tokens: 512,
    system: `${prompt}\n\nYou are starting a goal-setting conversation for a ${jar.category.toLowerCase()} jar. The treat: "${jar.treatDescription}". Send an opening message to kick off the discussion. Be warm, curious, and reference the group's interests. If it's a workout jar, mention you'll look at their activity history.`,
    messages: [
      { role: "user", content: "Start the goal-setting conversation for this jar." },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  if (text) {
    for (const member of jar.group.members) {
      await sendSms(member.user.phone, text);
    }
  }

  return { jarId, status: "GOAL_SETTING", membersNotified: jar.group.members.length };
}
```

- [ ] **Step 2: Create the goal-setting API route**

```typescript
// src/app/api/agents/goal-setting/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { startGoalSetting } from "@/lib/agents/goal-setting";

/**
 * POST: Trigger goal-setting for a jar.
 * Called from the web app when a group is ready to set goals.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jarId } = await request.json();
  if (!jarId) {
    return NextResponse.json({ error: "jarId required" }, { status: 400 });
  }

  // Verify jar exists and user is a member
  const jar = await db.jar.findUnique({
    where: { id: jarId },
    include: {
      group: { include: { members: true } },
    },
  });

  if (!jar) {
    return NextResponse.json({ error: "Jar not found" }, { status: 404 });
  }

  const user = await db.user.findUnique({ where: { email: authUser.email } });
  if (!user || !jar.group.members.some((m) => m.userId === user.id)) {
    return NextResponse.json({ error: "Not a member of this jar's group" }, { status: 403 });
  }

  if (jar.status !== "PENDING") {
    return NextResponse.json({ error: `Jar is already ${jar.status}` }, { status: 400 });
  }

  const result = await startGoalSetting(jarId);
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Update SMS router to handle GOAL_SETTING jars**

Modify `src/app/api/sms/route.ts` to check for GOAL_SETTING jars and route to the goal-setting agent:

After looking up the user and before calling `handleIntakeMessage`, add:

```typescript
// Check for jars in GOAL_SETTING status
const goalSettingMemberships = await db.groupMember.findMany({
  where: { userId: user.id },
  include: {
    group: {
      include: {
        jars: { where: { status: "GOAL_SETTING" } },
      },
    },
  },
});

const goalSettingJars = goalSettingMemberships.flatMap((m) => m.group.jars);

if (goalSettingJars.length > 0) {
  // Check if user ALSO has active jars — if so, we need to disambiguate
  const hasActiveJars = await db.jar.findFirst({
    where: {
      status: "ACTIVE",
      group: { members: { some: { userId: user.id } } },
    },
  });

  if (hasActiveJars) {
    // User has both GOAL_SETTING and ACTIVE jars
    // Let the intake agent handle it — it can see both and will ask if ambiguous
    await handleIntakeMessage(user, body);
  } else {
    // Only GOAL_SETTING jars — route to goal-setting agent
    const { handleGoalSettingMessage } = await import("@/lib/agents/goal-setting");
    await handleGoalSettingMessage(user, goalSettingJars[0].id, body);
  }
  return twimlResponse();
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/agents/goal-setting.ts src/app/api/agents/goal-setting/ src/app/api/sms/route.ts
git commit -m "feat: add goal-setting agent with SMS group conversation and jar activation"
```

---

## Chunk 2: Hype Agent (Level 3)

### Task 3: Hype Agent

**Files:**
- Create: `src/lib/agents/hype.ts`
- Create: `src/app/api/agents/hype/route.ts`

- [ ] **Step 1: Create the hype agent**

```typescript
// src/lib/agents/hype.ts
import Anthropic from "@anthropic-ai/sdk";
import { buildGroupContext, buildSystemPrompt } from "./personality";
import { getAgentMemories, saveAgentMemory, postToFeed } from "./tools/memory-tools";
import { searchImage } from "./tools/image-tools";
import { sendSms } from "@/lib/twilio";
import { db } from "@/lib/db";

const anthropic = new Anthropic();
const AGENT_MODEL = "claude-sonnet-4-20250514";

const hypeTools: Anthropic.Tool[] = [
  {
    name: "get_agent_memories",
    description: "Recall your recent memories about this group — running jokes, what landed, escalation state.",
    input_schema: {
      type: "object" as const,
      properties: {
        group_id: { type: "string" },
        limit: { type: "number" },
      },
      required: ["group_id"],
    },
  },
  {
    name: "save_memory",
    description: "Save a memory about this group for future reference. Types: joke, escalation, observation, callback, mood.",
    input_schema: {
      type: "object" as const,
      properties: {
        group_id: { type: "string" },
        type: { type: "string", enum: ["joke", "escalation", "observation", "callback", "mood"] },
        content: { type: "string" },
      },
      required: ["group_id", "type", "content"],
    },
  },
  {
    name: "send_group_message",
    description: "Send an SMS to all members of a group. Use sparingly — only when you have something worth saying.",
    input_schema: {
      type: "object" as const,
      properties: {
        group_id: { type: "string" },
        message: { type: "string" },
        media_url: { type: "string", description: "Optional image URL for MMS" },
      },
      required: ["group_id", "message"],
    },
  },
  {
    name: "send_individual_message",
    description: "Send an SMS to one specific member. Use for targeted nudges, escalation, or personal callbacks.",
    input_schema: {
      type: "object" as const,
      properties: {
        phone: { type: "string" },
        message: { type: "string" },
        media_url: { type: "string" },
      },
      required: ["phone", "message"],
    },
  },
  {
    name: "post_to_feed",
    description: "Post a message to the jar's web feed so everyone can see it (even if they missed the SMS).",
    input_schema: {
      type: "object" as const,
      properties: {
        jar_id: { type: "string" },
        content: { type: "string" },
        media_url: { type: "string" },
      },
      required: ["jar_id", "content"],
    },
  },
  {
    name: "search_image",
    description: "Search for an image to include in a message. Use when a picture would be funnier or more impactful than words.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "stay_quiet",
    description: "Decide to say nothing today for this group. Not every day needs a message. Use when nothing interesting enough is happening.",
    input_schema: {
      type: "object" as const,
      properties: {
        reason: { type: "string", description: "Why you're staying quiet (saved as a memory)" },
      },
      required: ["reason"],
    },
  },
];

/**
 * Run the hype agent for all active groups.
 * Called by cron — iterates over every group with active jars.
 */
export async function runHypeAgent() {
  const activeJars = await db.jar.findMany({
    where: { status: "ACTIVE" },
    include: {
      group: {
        include: {
          members: { include: { user: true } },
        },
      },
      _count: { select: { marbles: true } },
    },
  });

  // Deduplicate by group (one hype check per group, not per jar)
  const groupIds = [...new Set(activeJars.map((j) => j.groupId))];

  const results = [];

  for (const groupId of groupIds) {
    try {
      const result = await runHypeForGroup(groupId, activeJars.filter((j) => j.groupId === groupId));
      results.push({ groupId, ...result });
    } catch (error) {
      console.error(`Hype agent error for group ${groupId}:`, error);
      results.push({ groupId, error: String(error) });
    }
  }

  return results;
}

async function runHypeForGroup(
  groupId: string,
  jars: Awaited<ReturnType<typeof db.jar.findMany>>
) {
  const context = await buildGroupContext(groupId);
  const basePrompt = buildSystemPrompt(context);

  const jarSummaries = jars.map((j) => {
    const count = (j as typeof j & { _count: { marbles: number } })._count?.marbles ?? 0;
    const pct = Math.round((count / j.capacity) * 100);
    return `- ${j.category.toLowerCase()} jar: "${j.treatDescription}" — ${count}/${j.capacity} marbles (${pct}% full)`;
  }).join("\n");

  const systemPrompt = `${basePrompt}

---

## HYPE MODE — AUTONOMOUS CHECK-IN

You are running your daily autonomous check-in for the "${context.groupName}" group.

Active jars:
${jarSummaries}

Your job:
1. Look at the member stats above. Notice what's interesting.
2. Check your memories — any running jokes to continue? Any escalation to follow up?
3. Decide: is there something worth saying today? If not, stay quiet.
4. If yes: write something specific, personal, and surprising. Use the favorites, use the mood context, use whatever serves the moment.
5. Save a memory about what you noticed and what you did (or didn't do).

Remember the escalation ladder:
- Day 2 quiet: gentle curiosity
- Day 3-4: playful nudge
- Day 5+: creative intervention (images, callbacks)
- Day 7+: full bit commitment

You can send group messages or individual messages. You can post to the feed.
You can also just observe and stay quiet. Not every day needs a message.`;

  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: "Run your daily check-in for this group." },
  ];

  const MAX_TURNS = 6;
  let spoke = false;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: AGENT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: hypeTools,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      break;
    }

    if (response.stop_reason === "tool_use") {
      const toolCalls = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const results: Anthropic.ToolResultBlockParam[] = [];

      for (const call of toolCalls) {
        const input = call.input as Record<string, unknown>;
        let result: unknown;

        switch (call.name) {
          case "get_agent_memories":
            result = await getAgentMemories(input.group_id as string, (input.limit as number) || 20);
            break;
          case "save_memory":
            result = await saveAgentMemory(input.group_id as string, input.type as string, input.content as string);
            break;
          case "send_group_message": {
            const group = await db.group.findUniqueOrThrow({
              where: { id: input.group_id as string },
              include: { members: { include: { user: true } } },
            });
            for (const m of group.members) {
              await sendSms(m.user.phone, input.message as string, input.media_url as string | undefined);
            }
            spoke = true;
            result = { sent: true, recipients: group.members.length };
            break;
          }
          case "send_individual_message":
            await sendSms(input.phone as string, input.message as string, input.media_url as string | undefined);
            spoke = true;
            result = { sent: true };
            break;
          case "post_to_feed": {
            result = await postToFeed(
              input.jar_id as string,
              "hype",
              input.content as string,
              undefined,
              input.media_url as string | undefined
            );
            break;
          }
          case "search_image":
            result = { url: await searchImage(input.query as string) };
            break;
          case "stay_quiet":
            await saveAgentMemory(groupId, "observation", `Stayed quiet: ${input.reason}`);
            result = { quiet: true };
            break;
          default:
            result = { error: `Unknown tool: ${call.name}` };
        }

        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: JSON.stringify(result),
        });
      }

      messages = [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: results },
      ];
    }
  }

  return { spoke, groupId };
}
```

- [ ] **Step 2: Create the hype agent API route**

```typescript
// src/app/api/agents/hype/route.ts
import { NextResponse } from "next/server";
import { runHypeAgent } from "@/lib/agents/hype";

/**
 * POST: Run the hype agent for all active groups.
 * Called by Supabase cron (or manually for testing).
 * Protected by a shared secret.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") || request.headers.get("x-hype-secret");

  if (secret !== process.env.HYPE_AGENT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runHypeAgent();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Hype agent error:", error);
    return NextResponse.json({ error: "Hype agent failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add HYPE_AGENT_SECRET to .env.local**

Add to `.env.local`:
```
HYPE_AGENT_SECRET=marble-jar-hype-secret-change-me
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/agents/hype.ts src/app/api/agents/hype/
git commit -m "feat: add Level 3 autonomous hype agent with memory, escalation, and cron endpoint"
```

---

## Chunk 3: Feed, Celebration, Profile

### Task 4: Feed Entry Component

**Files:**
- Create: `src/components/feed/feed-entry.tsx`

- [ ] **Step 1: Create the feed entry component**

```typescript
// src/components/feed/feed-entry.tsx
import { Marble } from "@/components/marble/marble";
import { getSymbolIcon } from "@/lib/constants";

interface FeedEntryProps {
  type: string; // marble_drop | hype | nag | milestone | celebration
  content: string;
  mediaUrl?: string | null;
  userName?: string | null;
  userColor?: string | null;
  userSymbol?: string | null;
  createdAt: string;
  index: number;
}

export function FeedEntry({
  type,
  content,
  mediaUrl,
  userName,
  userColor,
  userSymbol,
  createdAt,
  index,
}: FeedEntryProps) {
  const rotation = ((index * 1.7 + 0.3) % 3 - 1.5).toFixed(2);
  const date = new Date(createdAt);
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const typeLabels: Record<string, string> = {
    marble_drop: "marble dropped",
    hype: "hype check-in",
    nag: "nag sent",
    milestone: "milestone",
    celebration: "jar complete!",
  };

  return (
    <div
      className="border-3 border-ink bg-kraft-dark p-4 hard-shadow"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="flex items-start gap-3">
        {/* User marble (if applicable) */}
        {userColor && userSymbol && (
          <Marble color={userColor} symbol={userSymbol} size={32} />
        )}

        <div className="flex-1 min-w-0">
          {/* Type label */}
          <span
            className="inline-block px-2 py-0.5 text-xs font-archivo uppercase bg-ink text-white mb-1"
            style={{ transform: "rotate(-1deg)" }}
          >
            {typeLabels[type] || type}
          </span>

          {/* Content */}
          <p className="font-typewriter text-sm leading-relaxed mt-1">
            {content}
          </p>

          {/* Image if MMS */}
          {mediaUrl && (
            <img
              src={mediaUrl}
              alt=""
              className="mt-2 border-2 border-ink max-w-[200px]"
              style={{ transform: "rotate(1deg)" }}
            />
          )}

          {/* Timestamp */}
          <p className="text-xs text-ink/50 mt-2 font-mono">
            {dateStr} at {timeStr}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/feed/feed-entry.tsx
git commit -m "feat: add punk-styled feed entry component"
```

---

### Task 5: Feed Page

**Files:**
- Create: `src/app/(app)/group/[id]/feed/page.tsx`

- [ ] **Step 1: Create the per-group feed page**

```typescript
// src/app/(app)/group/[id]/feed/page.tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { FeedEntry } from "@/components/feed/feed-entry";
import { PaperCard } from "@/components/ui/paper-card";
import { TapeDivider } from "@/components/ui/tape-divider";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FeedPage({ params }: Props) {
  const { id: groupId } = await params;

  // Auth + membership check
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.email) redirect("/login");

  const currentUser = await db.user.findUnique({ where: { email: authUser.email } });
  if (!currentUser) redirect("/login");

  const membership = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: currentUser.id } },
  });
  if (!membership) notFound(); // Not a member of this group

  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      jars: {
        where: { status: { in: ["ACTIVE", "COMPLETE"] } },
        include: {
          feedPosts: {
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
              user: {
                select: { name: true, marbleColor: true, marbleSymbol: true },
              },
            },
          },
        },
      },
    },
  });

  if (!group) notFound();

  // Merge all feed posts across jars, sorted by date
  const allPosts = group.jars
    .flatMap((jar) =>
      jar.feedPosts.map((post) => ({
        ...post,
        jarCategory: jar.category,
      }))
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="min-h-screen bg-kraft p-4">
      <div className="max-w-lg mx-auto">
        <h1
          className="font-marker text-3xl mb-1"
          style={{ transform: "rotate(-1.5deg)" }}
        >
          {group.name}
        </h1>
        <p className="font-typewriter text-ink/60 mb-4">the feed</p>

        <TapeDivider index={0} className="mb-6" />

        {allPosts.length === 0 ? (
          <PaperCard index={0} className="p-6 text-center">
            <p className="font-marker text-xl">nothing here yet</p>
            <p className="font-typewriter text-ink/60 mt-2">
              marbles will show up here as they drop. the agent's texts too.
            </p>
          </PaperCard>
        ) : (
          <div className="space-y-4">
            {allPosts.map((post, i) => (
              <FeedEntry
                key={post.id}
                type={post.type}
                content={post.content}
                mediaUrl={post.mediaUrl}
                userName={post.user?.name}
                userColor={post.user?.marbleColor}
                userSymbol={post.user?.marbleSymbol}
                createdAt={post.createdAt.toISOString()}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/group/\[id\]/feed/
git commit -m "feat: add per-group feed page with punk-styled entries"
```

---

### Task 6: Marble Minting → Feed Post + Jar Completion Check

**Files:**
- Modify: `src/lib/agents/tools/marble-tools.ts`

When a marble is minted, we need to:
1. Create a FeedPost so it shows up in the feed
2. Check if the jar is now full → transition to COMPLETE

- [ ] **Step 1: Update logActivityAndMintMarble to post to feed and check completion**

Add to the end of `logActivityAndMintMarble`, after successfully creating the marble:

```typescript
// After marble creation succeeds, inside the try block:

// Post to feed
await db.feedPost.create({
  data: {
    jarId,
    userId,
    type: "marble_drop",
    content: description,
  },
});

// Atomic jar completion check — use transaction to prevent race condition
// where two simultaneous final marbles both trigger celebration
const jarComplete = await db.$transaction(async (tx) => {
  const jar = await tx.jar.findUniqueOrThrow({
    where: { id: jarId },
    include: { _count: { select: { marbles: true } } },
  });

  if (jar._count.marbles >= jar.capacity && jar.status === "ACTIVE") {
    await tx.jar.update({
      where: { id: jarId, status: "ACTIVE" }, // optimistic lock via status check
      data: { status: "COMPLETE", completedAt: new Date() },
    });

    await tx.feedPost.create({
      data: {
        jarId,
        type: "celebration",
        content: `THE JAR IS FULL! ${jar._count.marbles} marbles. Time for the treat: "${jar.treatDescription}"`,
      },
    });

    return true;
  }
  return false;
});

return { success: true, marble, activity, jarComplete };
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agents/tools/marble-tools.ts
git commit -m "feat: post to feed on marble mint and check for jar completion"
```

---

### Task 7: Celebration Screen

**Files:**
- Create: `src/components/celebration/confetti.tsx`
- Create: `src/app/(app)/celebrate/[jarId]/page.tsx`

- [ ] **Step 1: Create confetti animation component**

```typescript
// src/components/celebration/confetti.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  size: number;
}

const COLORS = ["#e8175d", "#000000", "#ffffff", "#d94040", "#2b6cb0", "#805ad5", "#d69e2e", "#2f855a"];

export function Confetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const generated: ConfettiPiece[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: (i * 17.3 + 5.7) % 100, // deterministic spread
      color: COLORS[i % COLORS.length],
      delay: (i * 0.05) % 2,
      rotation: ((i * 37) % 360),
      size: 8 + (i % 4) * 4,
    }));
    setPieces(generated);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{ y: -20, x: `${piece.x}vw`, opacity: 1, rotate: 0 }}
            animate={{
              y: "110vh",
              rotate: piece.rotation * 3,
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 3 + (piece.id % 3),
              delay: piece.delay,
              ease: "easeIn",
            }}
            className="absolute"
            style={{
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              border: "1.5px solid #000",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Create celebration page**

```typescript
// src/app/(app)/celebrate/[jarId]/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Marble } from "@/components/marble/marble";
import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { TapeDivider } from "@/components/ui/tape-divider";
import { Confetti } from "@/components/celebration/confetti";
import { getSymbolIcon } from "@/lib/constants";
import Link from "next/link";

interface Props {
  params: Promise<{ jarId: string }>;
}

export default async function CelebratePage({ params }: Props) {
  const { jarId } = await params;

  const jar = await db.jar.findUnique({
    where: { id: jarId },
    include: {
      group: {
        include: {
          members: { include: { user: true } },
        },
      },
      marbles: {
        include: { user: true },
      },
    },
  });

  if (!jar || jar.status !== "COMPLETE") notFound();

  // Count marbles per member
  const memberContributions = jar.group.members.map((m) => {
    const count = jar.marbles.filter((mb) => mb.userId === m.userId).length;
    return {
      name: m.user.name,
      color: m.user.marbleColor || "#888",
      symbol: m.user.marbleSymbol || "star",
      count,
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-ink text-white p-4 relative overflow-hidden">
      <Confetti />

      <div className="max-w-lg mx-auto relative z-10 pt-12">
        {/* Big announcement */}
        <div className="text-center mb-8">
          <h1
            className="font-marker text-5xl text-punk-pink mb-2"
            style={{ transform: "rotate(-2deg)" }}
          >
            JAR FULL!
          </h1>
          <p className="font-archivo text-xl uppercase tracking-wider">
            {jar.marbles.length} marbles
          </p>
        </div>

        <TapeDivider index={0} className="mb-8 border-white/30" />

        {/* The treat */}
        <PaperCard index={1} className="p-8 text-center bg-punk-pink text-white border-white mb-8">
          <p className="font-typewriter text-sm uppercase tracking-wider mb-2 opacity-80">
            the treat
          </p>
          <p className="font-marker text-3xl">
            {jar.treatDescription}
          </p>
        </PaperCard>

        {/* All the marbles */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {jar.marbles.slice(0, 40).map((marble, i) => (
            <Marble
              key={marble.id}
              color={marble.user.marbleColor || "#888"}
              symbol={marble.user.marbleSymbol || "star"}
              size={28}
              className={`${((i * 1.7) % 3 - 1.5) > 0 ? "rotate-1" : "-rotate-1"}`}
            />
          ))}
          {jar.marbles.length > 40 && (
            <span className="font-mono text-xs text-white/60 self-center">
              +{jar.marbles.length - 40} more
            </span>
          )}
        </div>

        {/* Member contributions */}
        <PaperCard index={2} className="p-6 mb-8">
          <h2 className="font-marker text-xl mb-4 text-ink">the crew</h2>
          <div className="space-y-3">
            {memberContributions.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <Marble color={m.color} symbol={m.symbol} size={28} />
                <span className="font-typewriter text-ink flex-1">{m.name}</span>
                <span className="font-archivo text-ink font-bold">{m.count}</span>
              </div>
            ))}
          </div>
        </PaperCard>

        {/* Action */}
        <div className="text-center">
          <Link href="/dashboard">
            <ZineButton variant="secondary" className="border-white text-white">
              BACK TO JARS
            </ZineButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/celebration/ src/app/\(app\)/celebrate/
git commit -m "feat: add celebration screen with confetti, treat reveal, and member contributions"
```

---

### Task 8: Profile Page

**Files:**
- Create: `src/app/(app)/profile/page.tsx`

- [ ] **Step 1: Create profile page**

```typescript
// src/app/(app)/profile/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { Marble } from "@/components/marble/marble";
import { PaperCard } from "@/components/ui/paper-card";
import { TapeDivider } from "@/components/ui/tape-divider";
import { getSymbolIcon } from "@/lib/constants";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.email) redirect("/login");

  const user = await db.user.findUnique({
    where: { email: authUser.email },
    include: {
      favorites: { orderBy: { addedAt: "desc" } },
      marbles: { orderBy: { earnedAt: "desc" } },
    },
  });

  if (!user) redirect("/login");

  // Calculate stats
  const totalMarbles = user.marbles.length;

  // Current streak
  const today = new Date().toISOString().split("T")[0];
  const marbleDates = [...new Set(user.marbles.map((m) => m.dayDate))].sort().reverse();
  let currentStreak = 0;
  const checkDate = new Date();
  if (marbleDates[0] !== today) checkDate.setDate(checkDate.getDate() - 1);
  const dateSet = new Set(marbleDates);
  while (dateSet.has(checkDate.toISOString().split("T")[0])) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  const sortedDates = [...marbleDates].sort();
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) { tempStreak = 1; continue; }
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Completed jars
  const completedJars = await db.jar.findMany({
    where: {
      status: "COMPLETE",
      group: { members: { some: { userId: user.id } } },
    },
    include: { group: { select: { name: true } } },
  });

  // Group favorites by category
  const favoritesByCategory: Record<string, string[]> = {};
  for (const fav of user.favorites) {
    if (!favoritesByCategory[fav.category]) favoritesByCategory[fav.category] = [];
    favoritesByCategory[fav.category].push(fav.value);
  }

  return (
    <div className="min-h-screen bg-kraft p-4">
      <div className="max-w-lg mx-auto">
        {/* Header with marble */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-marker text-3xl" style={{ transform: "rotate(-1deg)" }}>
              {user.name}
            </h1>
            <p className="font-typewriter text-ink/60">{user.email}</p>
          </div>
          <Marble
            color={user.marbleColor || "#888"}
            symbol={user.marbleSymbol || "star"}
            size={64}
          />
        </div>

        <TapeDivider index={0} className="mb-6" />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "total marbles", value: totalMarbles },
            { label: "current streak", value: `${currentStreak}d` },
            { label: "longest streak", value: `${longestStreak}d` },
          ].map((stat, i) => (
            <PaperCard key={i} index={i} className="p-3 text-center">
              <p className="font-archivo text-2xl font-bold">{stat.value}</p>
              <p className="font-typewriter text-xs text-ink/60">{stat.label}</p>
            </PaperCard>
          ))}
        </div>

        {/* Favorites */}
        <PaperCard index={3} className="p-5 mb-6">
          <h2 className="font-marker text-xl mb-3">your favorites</h2>
          {Object.keys(favoritesByCategory).length === 0 ? (
            <p className="font-typewriter text-ink/60">no favorites yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(favoritesByCategory).map(([category, values]) => (
                <div key={category}>
                  <p className="font-archivo text-xs uppercase tracking-wider text-ink/50 mb-1">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {values.map((v, i) => (
                      <span
                        key={i}
                        className="inline-block px-2 py-1 bg-ink text-white text-sm font-typewriter border border-ink"
                        style={{ transform: `rotate(${((i * 1.7 + 0.3) % 3 - 1.5).toFixed(1)}deg)` }}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PaperCard>

        {/* Connected accounts */}
        <PaperCard index={4} className="p-5 mb-6">
          <h2 className="font-marker text-xl mb-3">connected</h2>
          <div className="space-y-2 font-typewriter text-sm">
            <p>
              phone: <strong>{user.phone}</strong>
            </p>
            <p>
              strava:{" "}
              {user.stravaAthleteId ? (
                <strong className="text-punk-pink">connected</strong>
              ) : (
                <Link href="/api/strava/connect" className="underline text-punk-pink">
                  connect now
                </Link>
              )}
            </p>
          </div>
        </PaperCard>

        {/* Completed jars */}
        {completedJars.length > 0 && (
          <PaperCard index={5} className="p-5 mb-6">
            <h2 className="font-marker text-xl mb-3">completed jars</h2>
            <div className="space-y-2">
              {completedJars.map((jar, i) => (
                <Link
                  key={jar.id}
                  href={`/celebrate/${jar.id}`}
                  className="block p-2 border-2 border-ink bg-kraft-dark font-typewriter text-sm hover:bg-punk-pink hover:text-white transition-colors"
                  style={{ transform: `rotate(${((i * 0.7) % 1 - 0.5).toFixed(1)}deg)` }}
                >
                  {jar.group.name} — {jar.treatDescription}
                </Link>
              ))}
            </div>
          </PaperCard>
        )}

        {/* Back */}
        <div className="text-center">
          <Link href="/dashboard" className="font-typewriter text-ink/60 underline">
            ← back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add profile link to dashboard**

In `src/app/(app)/dashboard/page.tsx`, add a link to the profile page in the header area (near the user's marble). Something like wrapping the marble in a `<Link href="/profile">`.

- [ ] **Step 3: Add feed links to dashboard**

In `src/app/(app)/dashboard/page.tsx`, add a "feed" link for each group that goes to `/group/[id]/feed`.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/profile/ src/app/\(app\)/dashboard/
git commit -m "feat: add profile page with stats, favorites, and completed jars"
```

---

### Task 9: Build Verification

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Verify all routes compile. Expected new routes:
```
/api/agents/goal-setting
/api/agents/hype
/group/[id]/feed
/celebrate/[jarId]
/profile
```

- [ ] **Step 2: Commit any fixes**

---

## Summary

**This plan produces:**
- Goal-setting agent with SMS group conversation, approval tracking, and jar activation
- Level 3 autonomous hype agent with memory, escalation ladder, and stay-quiet capability
- Per-group feed page showing marble drops, hype messages, and celebrations
- Marble minting → feed post + jar completion check
- Celebration screen with confetti, treat reveal, and member contributions
- Profile page with stats, favorites, connected accounts, and completed jar history
- Dashboard links to feed and profile

**What comes next (Plan 4):**
- Navigation/layout improvements
- Group settings page (invite link, treat editing for pending jars)
- Supabase cron setup for hype agent
- Polish and edge case handling
