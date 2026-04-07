"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";
import { ProgressDots } from "@/components/ui/progress-dots";
import { TapeDivider } from "@/components/ui/tape-divider";

type Mode = "choose" | "create" | "join";

export default function GroupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      router.push(`/onboarding/jars?groupId=${data.groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/group/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <ProgressDots total={6} current={4} className="mb-6" />

      <PaperCard index={3} className="p-6">
        {mode === "choose" && (
          <div>
            <h2
              className="font-marker text-2xl text-ink mb-1"
              style={{ transform: "rotate(-0.9deg)" }}
            >
              your crew
            </h2>
            <p className="font-typewriter text-sm text-ink/70 mb-6">
              marbles only work with witnesses. start a group or join one.
            </p>
            <div className="flex flex-col gap-3">
              <ZineButton variant="primary" onClick={() => setMode("create")}>
                START A NEW GROUP
              </ZineButton>
              <ZineButton variant="secondary" onClick={() => setMode("join")}>
                JOIN WITH INVITE CODE
              </ZineButton>
            </div>
          </div>
        )}

        {mode === "create" && (
          <div>
            <h2
              className="font-marker text-2xl text-ink mb-1"
              style={{ transform: "rotate(0.5deg)" }}
            >
              name your crew
            </h2>
            <p className="font-typewriter text-sm text-ink/70 mb-4">
              something your mates will recognise.
            </p>
            <InkInput
              label="Group name"
              placeholder="the reckless ones..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />

            {error && (
              <p className="font-typewriter text-sm text-punk-pink mt-3">{error}</p>
            )}

            <TapeDivider index={4} />
            <div className="flex gap-3">
              <ZineButton
                variant="secondary"
                onClick={() => {
                  setMode("choose");
                  setError("");
                }}
              >
                BACK
              </ZineButton>
              <ZineButton
                variant="primary"
                onClick={handleCreate}
                disabled={!groupName.trim() || loading}
              >
                {loading ? "CREATING..." : "CREATE"}
              </ZineButton>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div>
            <h2
              className="font-marker text-2xl text-ink mb-1"
              style={{ transform: "rotate(-0.7deg)" }}
            >
              got a code?
            </h2>
            <p className="font-typewriter text-sm text-ink/70 mb-4">
              paste the invite code your mate sent you.
            </p>
            <InkInput
              label="Invite code"
              placeholder="a1b2c3d4"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />

            {error && (
              <p className="font-typewriter text-sm text-punk-pink mt-3">{error}</p>
            )}

            <TapeDivider index={5} />
            <div className="flex gap-3">
              <ZineButton
                variant="secondary"
                onClick={() => {
                  setMode("choose");
                  setError("");
                }}
              >
                BACK
              </ZineButton>
              <ZineButton
                variant="primary"
                onClick={handleJoin}
                disabled={!inviteCode.trim() || loading}
              >
                {loading ? "JOINING..." : "JOIN"}
              </ZineButton>
            </div>
          </div>
        )}
      </PaperCard>
    </div>
  );
}
