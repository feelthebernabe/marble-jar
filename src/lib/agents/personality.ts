import { SOUL_DOC } from "./soul";
import { sampleContrasts, formatContrastsForPrompt } from "./contrasts";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemberStat {
  name: string;
  streak: number;
  daysSinceLastMarble: number;
  totalMarbles: number;
}

export interface GroupContext {
  groupId: string;
  groupName: string;
  favorites: string[];
  recentMemories: string[];
  memberStats: MemberStat[];
  mood: string;
  astrology: string;
}

// ---------------------------------------------------------------------------
// Astrology helpers
// ---------------------------------------------------------------------------

interface SignInfo {
  sign: string;
  element: string;
  energy: string;
  startMonth: number;
  startDay: number;
}

const SIGNS: SignInfo[] = [
  { sign: "Capricorn", element: "earth", energy: "disciplined and ambitious", startMonth: 12, startDay: 22 },
  { sign: "Aquarius", element: "air", energy: "visionary and contrarian", startMonth: 1, startDay: 20 },
  { sign: "Pisces", element: "water", energy: "dreamy and permeable", startMonth: 2, startDay: 19 },
  { sign: "Aries", element: "fire", energy: "bold and impatient", startMonth: 3, startDay: 21 },
  { sign: "Taurus", element: "earth", energy: "stubborn and sensual", startMonth: 4, startDay: 20 },
  { sign: "Gemini", element: "air", energy: "restless and quick-witted", startMonth: 5, startDay: 21 },
  { sign: "Cancer", element: "water", energy: "protective and moody", startMonth: 6, startDay: 21 },
  { sign: "Leo", element: "fire", energy: "dramatic and generous", startMonth: 7, startDay: 23 },
  { sign: "Virgo", element: "earth", energy: "precise and self-critical", startMonth: 8, startDay: 23 },
  { sign: "Libra", element: "air", energy: "diplomatic and indecisive", startMonth: 9, startDay: 23 },
  { sign: "Scorpio", element: "water", energy: "intense and secretive", startMonth: 10, startDay: 23 },
  { sign: "Sagittarius", element: "fire", energy: "restless and philosophical", startMonth: 11, startDay: 22 },
];

function getSunSign(date: Date): SignInfo {
  const m = date.getMonth() + 1; // 1-indexed
  const d = date.getDate();

  // Walk backwards through the sign list — the first sign whose start date
  // is <= (m, d) is the current sign. Because Capricorn straddles the year
  // boundary we fall through to it as the default.
  for (let i = SIGNS.length - 1; i >= 0; i--) {
    const s = SIGNS[i];
    if (m > s.startMonth || (m === s.startMonth && d >= s.startDay)) {
      return s;
    }
  }
  // Before Jan 20 → still Capricorn
  return SIGNS[0];
}

const MOON_PHASES = [
  "new moon — beginnings, intentions",
  "waxing crescent — building momentum",
  "first quarter — tension, decisions",
  "waxing gibbous — refinement, patience",
  "full moon — illumination, intensity",
  "waning gibbous — gratitude, sharing",
  "last quarter — release, re-evaluation",
  "waning crescent — rest, surrender",
] as const;

function getMoonPhase(date: Date): string {
  // Known new moon: 2024-01-11T11:57Z
  const knownNewMoon = new Date("2024-01-11T11:57:00Z");
  const SYNODIC_PERIOD = 29.53;
  const diffDays = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const cyclePosition = ((diffDays % SYNODIC_PERIOD) + SYNODIC_PERIOD) % SYNODIC_PERIOD;
  const phaseIndex = Math.floor((cyclePosition / SYNODIC_PERIOD) * 8) % 8;
  return MOON_PHASES[phaseIndex];
}

function getAstrologyContext(date: Date = new Date()): string {
  const sun = getSunSign(date);
  const moon = getMoonPhase(date);
  return `Sun season: ${sun.sign} (${sun.element}, ${sun.energy}). Moon: ${moon}.`;
}

// ---------------------------------------------------------------------------
// Mood selection
// ---------------------------------------------------------------------------

function selectMood(memberStats: MemberStat[]): string {
  if (memberStats.length === 0) return "warm and curious";

  const quietCount = memberStats.filter((m) => m.daysSinceLastMarble >= 2).length;
  const quietRatio = quietCount / memberStats.length;
  const avgStreak =
    memberStats.reduce((sum, m) => sum + m.streak, 0) / memberStats.length;

  if (avgStreak >= 5) return "nostalgic storyteller";
  if (quietRatio >= 0.6) return "instigator";
  if (quietCount === 0 && avgStreak >= 3) return "hype coach";
  if (quietCount > 0 && quietCount < memberStats.length) return "philosopher";
  return "warm and curious";
}

// ---------------------------------------------------------------------------
// Deterministic shuffle (seeded by hour so it's stable within a message batch
// but rotates favorites over time)
// ---------------------------------------------------------------------------

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  // Simple xorshift-based PRNG
  let s = seed | 0 || 1;
  const next = () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Build group context from DB
// ---------------------------------------------------------------------------

export async function buildGroupContext(groupId: string): Promise<GroupContext> {
  // 1. Fetch group with members and recent memories
  const group = await db.group.findUniqueOrThrow({
    where: { id: groupId },
    include: {
      members: { include: { user: true } },
      agentMemories: { take: 10, orderBy: { createdAt: "desc" } },
    },
  });

  const userIds = group.members.map((m) => m.user.id);

  // 2. Fetch all favorites for group members
  const allFavorites = await db.favorite.findMany({
    where: { userId: { in: userIds } },
    include: { user: true },
  });

  // 3. Sample up to 8 favorites using hour-seeded shuffle
  const now = new Date();
  const hourSeed = now.getFullYear() * 1000000 + (now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours();
  const shuffled = seededShuffle(allFavorites, hourSeed);
  const sampledFavorites = shuffled.slice(0, 8).map(
    (f) => `${f.user.name}'s favorite ${f.category}: ${f.value}`
  );

  // 4. Calculate member stats
  const today = now.toISOString().split("T")[0];
  const memberStats: MemberStat[] = [];

  for (const member of group.members) {
    const marbles = await db.marble.findMany({
      where: {
        userId: member.user.id,
        jar: { groupId },
      },
      orderBy: { dayDate: "desc" },
    });

    const totalMarbles = marbles.length;
    const daysSinceLastMarble =
      marbles.length > 0
        ? Math.floor(
            (new Date(today).getTime() - new Date(marbles[0].dayDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 999;

    // Streak: count consecutive days backwards from today
    let streak = 0;
    const dateSet = new Set(marbles.map((m) => m.dayDate));
    const cursor = new Date(today);
    while (true) {
      const key = cursor.toISOString().split("T")[0];
      if (dateSet.has(key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    memberStats.push({
      name: member.user.name,
      streak,
      daysSinceLastMarble,
      totalMarbles,
    });
  }

  // 5. Select mood and astrology
  const mood = selectMood(memberStats);
  const astrology = getAstrologyContext(now);

  // 6. Recent memories as strings
  const recentMemories = group.agentMemories.map((m) => `[${m.type}] ${m.content}`);

  return {
    groupId,
    groupName: group.name,
    favorites: sampledFavorites,
    recentMemories,
    memberStats,
    mood,
    astrology,
  };
}

// ---------------------------------------------------------------------------
// Build the full system prompt
// ---------------------------------------------------------------------------

export function buildSystemPrompt(context: GroupContext): string {
  const parts: string[] = [SOUL_DOC];

  parts.push(`\n## Current Context: ${context.groupName}\n`);
  parts.push(`**Your mood right now:** ${context.mood}`);
  parts.push(`**Mood color (internal only — do not reference in messages):** ${context.astrology}`);

  if (context.favorites.length > 0) {
    parts.push(`\n### Favorites Pot (use these as cultural vocabulary)`);
    for (const f of context.favorites) {
      parts.push(`- ${f}`);
    }
  }

  if (context.recentMemories.length > 0) {
    parts.push(`\n### Recent Memories`);
    for (const m of context.recentMemories) {
      parts.push(`- ${m}`);
    }
  }

  parts.push(`\n### Member Stats`);
  for (const s of context.memberStats) {
    parts.push(
      `- **${s.name}**: streak ${s.streak}, last marble ${s.daysSinceLastMarble === 999 ? "never" : `${s.daysSinceLastMarble}d ago`}, total ${s.totalMarbles}`
    );
  }

  // Add contrast examples so the agent has concrete good/bad message pairs
  const contrasts = sampleContrasts(3);
  const contrastSection = formatContrastsForPrompt(contrasts);
  if (contrastSection) {
    parts.push(contrastSection);
  }

  parts.push(
    `\n---\nRemember: be specific. Use names, numbers, and references from the favorites pot. Never be generic.`
  );

  return parts.join("\n");
}
