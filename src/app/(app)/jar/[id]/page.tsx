import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getSymbolIcon } from "@/lib/constants";
import { PaperCard } from "@/components/ui/paper-card";
import { TapeDivider } from "@/components/ui/tape-divider";
import { JarWithMarbles } from "@/components/jar/jar-with-marbles";
import { Marble } from "@/components/marble/marble";

const CATEGORY_EMOJI: Record<string, string> = {
  WORKOUT: "💪",
  MEDITATION: "🧘",
  CUSTOM: "✨",
};

function calculateStreak(
  dayDates: string[],
  today: string
): number {
  if (dayDates.length === 0) return 0;
  const sorted = [...dayDates].sort().reverse();
  // Streak must include today or yesterday to be active
  const todayDate = new Date(today);
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split("T")[0];

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffMs = prev.getTime() - curr.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default async function JarViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return notFound();

  const jar = await db.jar.findUnique({
    where: { id },
    include: {
      marbles: {
        include: { user: true },
        orderBy: { earnedAt: "asc" },
      },
      group: {
        include: {
          members: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!jar) return notFound();

  const today = new Date().toISOString().split("T")[0];

  // Build marble data for the jar component
  const marbleData = jar.marbles.map((m) => ({
    id: m.id,
    color: m.user.marbleColor || "#666666",
    symbol: m.user.marbleSymbol || "star",
  }));

  // Calculate per-member stats
  const memberStats = jar.group.members.map((gm) => {
    const userMarbles = jar.marbles.filter((m) => m.userId === gm.userId);
    const dayDates = userMarbles.map((m) => m.dayDate);
    const streak = calculateStreak(dayDates, today);
    const doneToday = dayDates.includes(today);
    return {
      id: gm.userId,
      name: gm.user.name,
      color: gm.user.marbleColor || "#666666",
      symbol: gm.user.marbleSymbol || "star",
      streak,
      doneToday,
    };
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1
        className="font-marker text-4xl text-ink mb-1"
        style={{ transform: "rotate(-1deg)" }}
      >
        {jar.group.name}
      </h1>
      <h2 className="font-archivo text-xl text-punk-pink mb-6">
        {CATEGORY_EMOJI[jar.category] || "✨"} {jar.category}
      </h2>

      {/* Jar visualization */}
      <div className="flex justify-center mb-8">
        <JarWithMarbles
          marbles={marbleData}
          capacity={jar.capacity}
          label={jar.category.toLowerCase()}
        />
      </div>

      {/* Treat */}
      <PaperCard index={0} className="mb-6">
        <h3 className="font-archivo text-sm text-punk-pink uppercase tracking-wider mb-1">
          THE TREAT
        </h3>
        <p className="font-marker text-xl text-ink">
          {jar.treatDescription}
        </p>
        {jar.goalDescription && (
          <p className="font-typewriter text-sm text-ink/60 mt-2">
            Goal: {jar.goalDescription}
          </p>
        )}
      </PaperCard>

      <TapeDivider index={0} />

      {/* Member stats */}
      <PaperCard index={1} className="mb-6">
        <h3 className="font-archivo text-sm text-punk-pink uppercase tracking-wider mb-4">
          THE CREW
        </h3>
        <div className="space-y-3">
          {memberStats.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <Marble
                color={member.color}
                symbol={member.symbol}
                size={32}
              />
              <span className="font-marker text-lg text-ink flex-1">
                {member.name}
              </span>
              <span className="font-typewriter text-sm text-ink/60">
                {member.streak > 0
                  ? `${member.streak}d streak`
                  : "no streak"}
              </span>
              <span
                className="font-mono text-lg"
                title={member.doneToday ? "Done today" : "Not yet today"}
              >
                {member.doneToday ? "✓" : "·"}
              </span>
            </div>
          ))}
        </div>
      </PaperCard>
    </div>
  );
}
