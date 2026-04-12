"use client";

import { useState, useOptimistic, useTransition } from "react";

const REACTIONS = ["🔥", "💪", "❤️", "🎉", "😤"] as const;

interface ReactionCount {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface ReactionBarProps {
  marbleId: string;
  reactions: ReactionCount[];
}

export function ReactionBar({ marbleId, reactions: initial }: ReactionBarProps) {
  const [reactions, setReactions] = useState(initial);
  const [isPending, startTransition] = useTransition();

  async function toggleReaction(emoji: string) {
    // Optimistic update
    setReactions((prev) =>
      prev.map((r) => {
        if (r.emoji !== emoji) return r;
        return {
          ...r,
          userReacted: !r.userReacted,
          count: r.userReacted ? r.count - 1 : r.count + 1,
        };
      })
    );

    startTransition(async () => {
      try {
        const res = await fetch("/api/feed/react", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marbleId, emoji }),
        });

        if (!res.ok) {
          // Revert on failure
          setReactions((prev) =>
            prev.map((r) => {
              if (r.emoji !== emoji) return r;
              return {
                ...r,
                userReacted: !r.userReacted,
                count: r.userReacted ? r.count - 1 : r.count + 1,
              };
            })
          );
        }
      } catch {
        // Revert on error
        setReactions((prev) =>
          prev.map((r) => {
            if (r.emoji !== emoji) return r;
            return {
              ...r,
              userReacted: !r.userReacted,
              count: r.userReacted ? r.count - 1 : r.count + 1,
            };
          })
        );
      }
    });
  }

  return (
    <div className="reaction-bar">
      {REACTIONS.map((emoji) => {
        const r = reactions.find((rx) => rx.emoji === emoji);
        const count = r?.count || 0;
        const active = r?.userReacted || false;

        return (
          <button
            key={emoji}
            className={`reaction-btn ${active ? "active" : ""}`}
            type="button"
            title={`React with ${emoji}`}
            onClick={() => toggleReaction(emoji)}
            disabled={isPending}
          >
            {emoji}
            {count > 0 && (
              <span className="font-mono text-[10px] ml-0.5">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
