"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ZineButton } from "@/components/ui/zine-button";

interface GoalActionsProps {
  jarId: string;
  jarStatus: string;
  hasGoal: boolean;
  userHasApproved: boolean;
}

export function GoalActions({
  jarId,
  jarStatus,
  hasGoal,
  userHasApproved,
}: GoalActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function triggerGoalSetting() {
    setMessage("Agent is analyzing your group...");
    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/goal-setting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jarId }),
        });

        if (!res.ok) throw new Error("Agent failed");

        const data = await res.json();
        setMessage(`Goal proposed: "${data.goal}". Check the feed!`);
        router.refresh();
      } catch {
        setMessage("Something went wrong. Try again.");
      }
    });
  }

  async function handleApprove() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/agents/goal-approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jarId }),
        });

        if (!res.ok) throw new Error("Approval failed");

        const data = await res.json();
        if (data.activated) {
          setMessage("🎉 All approved! Jar is now active!");
        } else {
          setMessage(
            `Approved! Waiting on ${data.pendingApprovals} more member${
              data.pendingApprovals !== 1 ? "s" : ""
            }.`
          );
        }
        router.refresh();
      } catch {
        setMessage("Something went wrong. Try again.");
      }
    });
  }

  const isGoalSetting = jarStatus === "GOAL_SETTING";
  const isPending_ = jarStatus === "PENDING";
  const isActive = jarStatus === "ACTIVE";

  return (
    <div className="mt-4 space-y-3">
      {/* Trigger goal-setting agent */}
      {(isPending_ || (isGoalSetting && !hasGoal)) && (
        <ZineButton
          variant="primary"
          onClick={triggerGoalSetting}
          disabled={isPending}
        >
          {isPending ? "THINKING..." : "🤖 LET THE AGENT SET A GOAL"}
        </ZineButton>
      )}

      {/* Approve goal */}
      {isGoalSetting && hasGoal && !userHasApproved && (
        <ZineButton
          variant="primary"
          onClick={handleApprove}
          disabled={isPending}
        >
          {isPending ? "APPROVING..." : "✓ APPROVE THIS GOAL"}
        </ZineButton>
      )}

      {isGoalSetting && hasGoal && userHasApproved && (
        <p className="font-typewriter text-sm text-ink/60">
          ✓ You&apos;ve approved. Waiting for the rest of the crew.
        </p>
      )}

      {isActive && (
        <p className="font-typewriter text-xs text-ink/40">
          🔒 Goal locked — jar is active
        </p>
      )}

      {message && (
        <p className="font-typewriter text-sm text-punk-pink mt-2">
          {message}
        </p>
      )}
    </div>
  );
}
