import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getUserDayDate } from "@/lib/timezone";
import { PaperCard } from "@/components/ui/paper-card";
import { TapeDivider } from "@/components/ui/tape-divider";
import { Marble } from "@/components/marble/marble";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return notFound();

  const user = await db.user.findUnique({ where: { id: authUser.id } });
  if (!user) return notFound();

  const today = getUserDayDate(user.timezone);

  // All marbles this user has ever earned
  const allMarbles = await db.marble.findMany({
    where: { userId: user.id },
    orderBy: { dayDate: "desc" },
    include: {
      jar: {
        include: { group: true },
      },
    },
  });

  // Calculate current streak (across all jars)
  const uniqueDays = [...new Set(allMarbles.map((m) => m.dayDate))].sort().reverse();
  let currentStreak = 0;
  {
    const cursor = new Date(today);
    const daySet = new Set(uniqueDays);
    while (true) {
      const key = cursor.toISOString().split("T")[0];
      if (daySet.has(key)) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  {
    let running = 0;
    for (let i = 0; i < uniqueDays.length; i++) {
      if (i === 0) {
        running = 1;
      } else {
        const prev = new Date(uniqueDays[i - 1]);
        const curr = new Date(uniqueDays[i]);
        const diff = Math.round(
          (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff === 1) {
          running++;
        } else {
          running = 1;
        }
      }
      longestStreak = Math.max(longestStreak, running);
    }
  }

  // Completed jars
  const completedJars = await db.jar.findMany({
    where: {
      status: "COMPLETE",
      group: {
        members: { some: { userId: user.id } },
      },
    },
    include: { group: true },
  });

  // Strava connection status
  const stravaConnected = !!user.stravaToken;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1
        className="font-marker text-4xl text-ink mb-2"
        style={{ transform: "rotate(-1.5deg)" }}
      >
        YOUR MARBLE
      </h1>
      <TapeDivider index={2} />

      {/* Big centered marble */}
      <div className="flex justify-center my-10">
        {user.marbleColor && user.marbleSymbol ? (
          <Marble
            color={user.marbleColor}
            symbol={user.marbleSymbol}
            size={120}
          />
        ) : (
          <div className="stamp" style={{ width: 120, height: 120, fontSize: 48 }}>
            ?
          </div>
        )}
      </div>

      <p className="font-marker text-2xl text-ink text-center mb-8">
        {user.name}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="stat-card hard-shadow">
          <span className="stat-value">{allMarbles.length}</span>
          <span className="stat-label">Marbles</span>
        </div>
        <div className="stat-card hard-shadow">
          <span className="stat-value">{currentStreak}</span>
          <span className="stat-label">Streak</span>
        </div>
        <div className="stat-card hard-shadow">
          <span className="stat-value">{longestStreak}</span>
          <span className="stat-label">Best</span>
        </div>
      </div>

      {/* Connected accounts */}
      <PaperCard index={0} className="p-5 mb-6">
        <h3 className="font-archivo text-sm text-punk-pink uppercase tracking-wider mb-3">
          CONNECTED ACCOUNTS
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-typewriter text-sm text-ink">Strava</span>
            {stravaConnected ? (
              <span className="font-mono text-xs text-ink/60 bg-green-100 border-2 border-green-600 px-2 py-1">
                ✓ Connected
              </span>
            ) : (
              <a
                href="/api/strava/connect"
                className="font-archivo text-xs uppercase tracking-wider border-2 border-ink px-3 py-1 bg-punk-pink text-white hover:bg-punk-pink-dark"
              >
                Connect
              </a>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-typewriter text-sm text-ink">Phone (SMS)</span>
            <span className="font-mono text-xs text-ink/50">
              {user.phone || "Not set"}
            </span>
          </div>
        </div>
      </PaperCard>

      {/* Completed jars */}
      <PaperCard index={1} className="p-5">
        <h3 className="font-archivo text-sm text-punk-pink uppercase tracking-wider mb-3">
          COMPLETED JARS
        </h3>
        {completedJars.length === 0 ? (
          <p className="font-typewriter text-sm text-ink/50">
            No completed jars yet. Keep going!
          </p>
        ) : (
          <div className="space-y-2">
            {completedJars.map((jar) => (
              <div
                key={jar.id}
                className="flex items-center justify-between border-b border-dashed border-ink/10 pb-2"
              >
                <div>
                  <span className="font-archivo text-sm">{jar.group.name}</span>
                  <span className="font-typewriter text-xs text-ink/50 ml-2">
                    {jar.category}
                  </span>
                </div>
                <span className="font-marker text-sm text-punk-pink">
                  {jar.treatDescription}
                </span>
              </div>
            ))}
          </div>
        )}
      </PaperCard>
    </div>
  );
}
