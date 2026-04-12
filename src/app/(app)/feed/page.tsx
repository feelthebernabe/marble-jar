import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { PaperCard } from "@/components/ui/paper-card";
import { TapeDivider } from "@/components/ui/tape-divider";
import { Marble } from "@/components/marble/marble";
import { ReactionBar } from "@/components/feed/reaction-bar";

const CATEGORY_EMOJI: Record<string, string> = {
  WORKOUT: "💪",
  MEDITATION: "🧘",
  CUSTOM: "✨",
};

const ALL_EMOJIS = ["🔥", "💪", "❤️", "🎉", "😤"];

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return notFound();

  const user = await db.user.findUnique({ where: { id: authUser.id } });
  if (!user) return notFound();

  // Fetch all groups this user belongs to
  const memberships = await db.groupMember.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  });

  const groupIds = memberships.map((m) => m.groupId);

  // Get all marbles from the user's groups, with user info and reactions
  const recentMarbles = await db.marble.findMany({
    where: {
      jar: { groupId: { in: groupIds } },
    },
    orderBy: { earnedAt: "desc" },
    take: 50,
    include: {
      user: true,
      jar: {
        include: {
          group: true,
          _count: { select: { marbles: true } },
        },
      },
      reactions: true,
    },
  });

  // Get feed posts (agent messages)
  const feedPosts = await db.feedPost.findMany({
    where: {
      jar: { groupId: { in: groupIds } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      user: true,
      jar: { include: { group: true } },
    },
  });

  // Build reaction counts per marble
  function buildReactionCounts(
    reactions: { emoji: string; userId: string }[]
  ) {
    return ALL_EMOJIS.map((emoji) => {
      const matching = reactions.filter((r) => r.emoji === emoji);
      return {
        emoji,
        count: matching.length,
        userReacted: matching.some((r) => r.userId === user!.id),
      };
    });
  }

  // Merge and sort by time
  type FeedEntry =
    | { type: "marble"; time: Date; data: (typeof recentMarbles)[0] }
    | { type: "post"; time: Date; data: (typeof feedPosts)[0] };

  const entries: FeedEntry[] = [
    ...recentMarbles.map(
      (m) => ({ type: "marble" as const, time: m.earnedAt, data: m })
    ),
    ...feedPosts.map(
      (p) => ({ type: "post" as const, time: p.createdAt, data: p })
    ),
  ].sort((a, b) => b.time.getTime() - a.time.getTime());

  function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    return `${days}d ago`;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1
        className="font-marker text-4xl text-ink mb-2"
        style={{ transform: "rotate(-1.2deg)" }}
      >
        THE FEED
      </h1>
      <TapeDivider index={1} />

      {entries.length === 0 ? (
        <PaperCard index={0} className="text-center py-12">
          <p className="font-typewriter text-ink/60">
            No activity yet. Go earn some marbles!
          </p>
        </PaperCard>
      ) : (
        <PaperCard index={0} className="p-4">
          {entries.map((entry) => {
            if (entry.type === "marble") {
              const m = entry.data;
              const jarEmoji = CATEGORY_EMOJI[m.jar.category] || "✨";
              const fillPct =
                m.jar.capacity > 0
                  ? Math.round((m.jar._count.marbles / m.jar.capacity) * 100)
                  : 0;
              const reactionCounts = buildReactionCounts(m.reactions);

              return (
                <div key={`marble-${m.id}`} className="feed-item" id={`feed-marble-${m.id}`}>
                  <Marble
                    color={m.user.marbleColor || "#666"}
                    symbol={m.user.marbleSymbol || "star"}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-typewriter text-sm text-ink">
                      <span className="font-archivo font-black">
                        {m.user.name}
                      </span>
                      {"'s marble dropped into the "}
                      <span className="font-archivo">
                        {jarEmoji} {m.jar.group.name}
                      </span>
                      {" jar"}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-xs text-ink/40">
                        {timeAgo(m.earnedAt)}
                      </span>
                      <span className="font-mono text-xs text-ink/30">
                        {fillPct}% full
                      </span>
                    </div>
                    <ReactionBar
                      marbleId={m.id}
                      reactions={reactionCounts}
                    />
                  </div>
                </div>
              );
            }

            // Feed post (agent message)
            const p = entry.data;
            return (
              <div key={`post-${p.id}`} className="feed-item" id={`feed-post-${p.id}`}>
                <span
                  className="stamp stamp--pink"
                  style={{ width: 36, height: 36, fontSize: 14 }}
                >
                  🤖
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-typewriter text-sm text-ink">
                    {p.content}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono text-xs text-ink/40">
                      {timeAgo(p.createdAt)}
                    </span>
                    <span className="font-typewriter text-xs text-punk-pink">
                      marble jar bot
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </PaperCard>
      )}
    </div>
  );
}
