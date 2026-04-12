import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import {
  getStravaHistory,
  getJarMembersForGoalSetting,
  setGroupGoal,
  postToJarFeed,
} from "./tools/goal-tools";

const anthropic = new Anthropic();
const AGENT_MODEL = "claude-sonnet-4-20250514";

const GOAL_SETTING_SYSTEM = `You are helping a group of friends set a shared daily goal for their marble jar.
Look at everyone's history, notice patterns, and guide them toward a goal that is
challenging but realistic — one that most people can actually hit most days.

For workout jars: pull strava history and reason about it before making a suggestion.
For meditation jars: suggest a reasonable starting point based on best practices (10-15 min is common).
For custom jars: ask what makes sense based on the category.

Be honest about what the data shows. Do not flatter. Do not suggest a goal that looks
impossible based on the history. The goal should make people a little proud and a little nervous.

After analyzing the data, propose a specific goal. Then post a short hype message to the jar feed.

Rules:
- Always call get_jar_members first to understand who's in the group
- For workout jars, call get_strava_history for each member who has Strava connected
- Propose a specific, measurable goal (e.g., "1 workout per day" or "10 min meditation")
- Call set_group_goal to lock in the proposed goal
- Call post_to_feed with a short, specific hype message about the goal
- Be warm, specific, and slightly competitive`;

const goalSettingTools: Tool[] = [
  {
    name: "get_jar_members",
    description:
      "Get all members of the jar with their names and Strava connection status. " +
      "Call this first to understand who's in the group.",
    input_schema: {
      type: "object",
      properties: {
        jar_id: { type: "string", description: "The jar ID" },
      },
      required: ["jar_id"],
    },
  },
  {
    name: "get_strava_history",
    description:
      "Get a member's Strava activity history for the last N weeks. " +
      "Returns weekly activity counts and types. Only works for members with Strava connected.",
    input_schema: {
      type: "object",
      properties: {
        user_id: { type: "string", description: "The user ID" },
        weeks: {
          type: "number",
          description: "Number of weeks of history to fetch (default 4)",
        },
      },
      required: ["user_id"],
    },
  },
  {
    name: "set_group_goal",
    description:
      "Set the proposed goal for the jar. This moves the jar to GOAL_SETTING status " +
      "and creates approval records for each member. Members will need to approve before " +
      "the jar activates.",
    input_schema: {
      type: "object",
      properties: {
        jar_id: { type: "string", description: "The jar ID" },
        goal: {
          type: "string",
          description:
            "The proposed goal (e.g., '1 workout per day', '10 min meditation daily')",
        },
      },
      required: ["jar_id", "goal"],
    },
  },
  {
    name: "post_to_feed",
    description:
      "Post a message to the jar's feed. Use this to announce the proposed goal " +
      "with a short hype message.",
    input_schema: {
      type: "object",
      properties: {
        jar_id: { type: "string", description: "The jar ID" },
        message: {
          type: "string",
          description: "The message to post to the feed",
        },
      },
      required: ["jar_id", "message"],
    },
  },
];

/**
 * Run the goal-setting agent for a jar.
 * Analyzes member history, proposes a goal, and posts to feed.
 */
export async function runGoalSettingAgent(jarId: string): Promise<{
  goal: string | null;
  feedMessage: string | null;
}> {
  let messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Set a goal for jar ${jarId}. First check who's in the group, then analyze their history, then propose and set a goal.`,
    },
  ];

  let proposedGoal: string | null = null;
  let feedMessage: string | null = null;

  const MAX_TURNS = 8;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: AGENT_MODEL,
      max_tokens: 1024,
      system: GOAL_SETTING_SYSTEM,
      tools: goalSettingTools,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      break;
    }

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolCall of toolUseBlocks) {
        const input = toolCall.input as Record<string, unknown>;
        let result: unknown;

        switch (toolCall.name) {
          case "get_jar_members":
            result = await getJarMembersForGoalSetting(input.jar_id as string);
            break;
          case "get_strava_history":
            result = await getStravaHistory(
              input.user_id as string,
              (input.weeks as number) || 4
            );
            break;
          case "set_group_goal":
            proposedGoal = input.goal as string;
            result = await setGroupGoal(input.jar_id as string, proposedGoal);
            break;
          case "post_to_feed":
            feedMessage = input.message as string;
            result = await postToJarFeed(input.jar_id as string, feedMessage);
            break;
          default:
            result = { error: `Unknown tool: ${toolCall.name}` };
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      messages = [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
    }
  }

  return { goal: proposedGoal, feedMessage };
}
