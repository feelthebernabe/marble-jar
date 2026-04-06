import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export const intakeTools: Tool[] = [
  {
    name: "log_activity_and_mint_marble",
    description:
      "Log a daily activity and mint a marble for it. Use this when a user reports " +
      "they completed their daily ritual — a workout, meditation, or custom habit. " +
      "This is the core action: the user did the thing, now the jar gets a marble.",
    input_schema: {
      type: "object",
      properties: {
        jar_id: {
          type: "string",
          description: "The ID of the jar to log the activity against.",
        },
        description: {
          type: "string",
          description:
            "A brief description of what the user actually did (e.g. '30 min run', '10 min meditation').",
        },
      },
      required: ["jar_id", "description"],
    },
  },
  {
    name: "get_active_jars",
    description:
      "Fetch the user's currently active jars. Use this when you need to know which " +
      "jars exist, their categories, and how full they are — especially before logging " +
      "an activity if the user hasn't specified which jar.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "notify_buddy",
    description:
      "Send a notification to the user's accountability buddy after they log an activity. " +
      "This is how the group stays connected — the buddy gets a short, personalized message " +
      "(and optionally an image). Craft the message in your voice, using the group's " +
      "cultural references and the buddy's name.",
    input_schema: {
      type: "object",
      properties: {
        jar_id: {
          type: "string",
          description: "The jar the activity was logged against.",
        },
        message: {
          type: "string",
          description:
            "The notification message for the buddy. Should be short (2-4 sentences), " +
            "specific, and in your voice — not generic.",
        },
        media_url: {
          type: "string",
          description:
            "Optional URL of an image or media to include with the notification.",
        },
      },
      required: ["jar_id", "message"],
    },
  },
  {
    name: "add_favorite",
    description:
      "Add something to the group's cultural favorites pot. Use this when a user shares " +
      "a movie, book, show, poet, or music they love. These favorites become the shared " +
      "vocabulary you reference in future messages.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["movie", "book", "show", "poet", "music"],
          description: "The type of favorite being added.",
        },
        value: {
          type: "string",
          description: "The name of the movie, book, show, poet, or music.",
        },
      },
      required: ["category", "value"],
    },
  },
  {
    name: "send_creative_message",
    description:
      "Send a creative, personalized message to a specific group member. Use this for " +
      "escalation nudges, celebrations, or when you want to reach out to someone directly " +
      "outside the normal buddy notification flow. This is your canvas for the unexpected — " +
      "poetry, callbacks, absurdist bits.",
    input_schema: {
      type: "object",
      properties: {
        target_name: {
          type: "string",
          description: "The name of the group member to message.",
        },
        message: {
          type: "string",
          description: "The creative message to send. Make it surprising.",
        },
        media_url: {
          type: "string",
          description: "Optional URL of an image or media to include.",
        },
      },
      required: ["target_name", "message"],
    },
  },
  {
    name: "search_image",
    description:
      "Search for an image to include in a message. Use this when you want to attach " +
      "something visual — a monk on a mountain, a sunset for a streak milestone, " +
      "something absurd for a day-7 escalation. The image should serve the bit.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A search query describing the image you want. Be specific and vivid.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "send_reply",
    description:
      "Send a conversational reply back to the user in the current thread. Use this " +
      "when you're responding to a question, acknowledging something, or just being " +
      "present in conversation. This is your speaking voice.",
    input_schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Your reply message. Short, specific, in character.",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "get_favorites_pot",
    description:
      "Fetch all favorites for a group — the shared cultural vocabulary. Use this when " +
      "you need to reference the group's taste before crafting a message, or when a user " +
      "asks what's in the pot.",
    input_schema: {
      type: "object",
      properties: {
        group_id: {
          type: "string",
          description: "The group whose favorites to fetch.",
        },
      },
      required: ["group_id"],
    },
  },
  {
    name: "get_jar_member_stats",
    description:
      "Fetch detailed stats for all members of a jar — streaks, last activity, total " +
      "marbles. Use this when you need to understand who's active, who's quiet, and " +
      "who might need a nudge.",
    input_schema: {
      type: "object",
      properties: {
        jar_id: {
          type: "string",
          description: "The jar to get member stats for.",
        },
      },
      required: ["jar_id"],
    },
  },
];
