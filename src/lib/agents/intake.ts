import Anthropic from "@anthropic-ai/sdk";
import { intakeTools } from "./prompts";
import { buildGroupContext, buildSystemPrompt } from "./personality";
import { getActiveJars, logActivityAndMintMarble } from "./tools/marble-tools";
import { notifyBuddy, sendCreativeMessage, sendReply } from "./tools/sms-tools";
import { addFavorite, getFavoritesPot } from "./tools/favorites-tools";
import { searchImage } from "./tools/image-tools";
import { getJarMemberStats } from "./tools/user-tools";
import { db } from "@/lib/db";

interface InboundUser {
  id: string;
  name: string;
  phone: string;
}

const anthropic = new Anthropic();
const AGENT_MODEL = "claude-sonnet-4-20250514";

export async function handleIntakeMessage(user: InboundUser, messageBody: string) {
  // Find all the user's groups
  const memberships = await db.groupMember.findMany({
    where: { userId: user.id },
    include: { group: true },
  });

  if (memberships.length === 0) {
    await sendReply(user.phone, "You're not in any groups yet. Head to the app to create or join one!");
    return;
  }

  // Build personality context from primary group (most recently joined)
  const primaryGroup = memberships[memberships.length - 1];
  const groupContext = await buildGroupContext(primaryGroup.groupId);
  const systemPrompt = buildSystemPrompt(groupContext);

  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: `[SMS from ${user.name} (${user.phone})]: ${messageBody}` },
  ];

  const MAX_TURNS = 5;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: AGENT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: intakeTools,
      messages,
    });

    // If just text (no tool use), send it and we're done
    if (response.stop_reason === "end_turn") {
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );
      if (textBlocks.length > 0) {
        await sendReply(user.phone, textBlocks.map((b) => b.text).join("\n"));
      }
      return;
    }

    // Process tool calls
    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolCall of toolUseBlocks) {
        const result = await executeToolCall(user, toolCall.name, toolCall.input as Record<string, unknown>);
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
}

async function executeToolCall(user: InboundUser, toolName: string, input: Record<string, unknown>): Promise<unknown> {
  switch (toolName) {
    case "get_active_jars":
      return getActiveJars(user.id);
    case "log_activity_and_mint_marble":
      return logActivityAndMintMarble(user.id, input.jar_id as string, input.description as string);
    case "notify_buddy":
      return notifyBuddy(user.id, input.jar_id as string, input.message as string, input.media_url as string | undefined);
    case "add_favorite":
      return addFavorite(user.id, input.category as string, input.value as string);
    case "send_creative_message":
      return sendCreativeMessage(user.id, input.target_name as string, input.message as string, input.media_url as string | undefined);
    case "search_image":
      return { url: await searchImage(input.query as string) };
    case "send_reply":
      return sendReply(user.phone, input.message as string);
    case "get_favorites_pot":
      return getFavoritesPot(input.group_id as string);
    case "get_jar_member_stats":
      return getJarMemberStats(user.id, input.jar_id as string);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
