import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getSymbolIcon } from "@/lib/constants";
import { PaperCard } from "@/components/ui/paper-card";
import { TapeDivider } from "@/components/ui/tape-divider";
import { Marble } from "@/components/marble/marble";

const CATEGORY_EMOJI: Record<string, string> = {
  WORKOUT: "💪",
  MEDITATION: "🧘",
  CUSTOM: "✨",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return notFound();

  const user = await db.user.findUnique({
    where: { id: authUser.id },
  });

  if (!user) return notFound();

  if (user.onboardingStep < 7) {
    redirect("/onboarding");
  }

  // Fetch groups with jars and marble counts
  const groups = await db.group.findMany({
    where: {
      members: { some: { userId: user.id } },
    },
    include: {
      members: true,
      jars: {
        include: {
          _count: {
            select: { marbles: true },
          },
        },
      },
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h1
          className="font-marker text-5xl text-ink"
          style={{ transform: "rotate(-1.5deg)" }}
        >
          MARBLE JAR
        </h1>
        {user.marbleColor && user.marbleSymbol && (
          <Marble
            color={user.marbleColor}
            symbol={user.marbleSymbol}
            size={40}
          />
        )}
      </div>

      <TapeDivider index={0} />

      {groups.length === 0 ? (
        /* Empty state */
        <PaperCard index={0} className="text-center py-12">
          <h2 className="font-archivo text-2xl text-ink mb-3">
            NO GROUPS YET
          </h2>
          <p className="font-typewriter text-ink/60 mb-6">
            Create a group with your mates or join one with an invite code.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/onboarding?step=group"
              className="font-archivo uppercase font-black text-sm tracking-wider border-3 border-ink px-5 py-3 bg-punk-pink text-white hard-shadow hover:bg-punk-pink-dark"
            >
              CREATE / JOIN
            </Link>
          </div>
        </PaperCard>
      ) : (
        /* Groups list */
        <div className="space-y-8">
          {groups.map((group, gi) => (
            <PaperCard key={group.id} index={gi} className="p-6">
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="font-marker text-2xl text-ink">
                  {group.name}
                </h2>
                <span className="font-mono text-xs text-ink/40">
                  {group.inviteCode}
                </span>
              </div>
              <p className="font-typewriter text-sm text-ink/50 mb-4">
                {group.members.length} member{group.members.length !== 1 ? "s" : ""}
              </p>

              {/* Jars in this group */}
              <div className="space-y-3">
                {group.jars.map((jar) => {
                  const count = jar._count.marbles;
                  const pct =
                    jar.capacity > 0
                      ? Math.round((count / jar.capacity) * 100)
                      : 0;
                  return (
                    <Link
                      key={jar.id}
                      href={`/jar/${jar.id}`}
                      className="block border-3 border-ink bg-kraft p-4 hover:bg-kraft-dark transition-colors hard-shadow"
                      style={{
                        transform: `rotate(${((gi + count) % 3 - 1) * 0.5}deg)`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-archivo text-sm uppercase tracking-wider">
                            {CATEGORY_EMOJI[jar.category] || "✨"}{" "}
                            {jar.category}
                          </span>
                          <p className="font-typewriter text-xs text-ink/50 mt-1">
                            {jar.treatDescription}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-marker text-lg">
                            {count}/{jar.capacity}
                          </span>
                          <p className="font-mono text-xs text-ink/40">
                            {pct}%
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </PaperCard>
          ))}
        </div>
      )}
    </div>
  );
}
