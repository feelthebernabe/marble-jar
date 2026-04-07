"use client";

import { useRouter } from "next/navigation";
import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { ProgressDots } from "@/components/ui/progress-dots";

export default function StravaPage() {
  const router = useRouter();

  return (
    <div>
      <ProgressDots total={6} current={3} className="mb-6" />

      <PaperCard index={3} className="p-6">
        <h2
          className="font-marker text-2xl text-ink mb-1"
          style={{ transform: "rotate(-0.8deg)" }}
        >
          connect strava
        </h2>
        <p className="font-typewriter text-sm text-ink/70 mb-6">
          connect strava and your workouts automatically drop marbles into the
          jar. no texting needed.
        </p>

        <div className="flex flex-col gap-3">
          <ZineButton
            variant="primary"
            onClick={() => {
              window.location.href = "/api/strava/connect";
            }}
          >
            CONNECT STRAVA
          </ZineButton>
          <ZineButton
            variant="secondary"
            onClick={() => router.push("/onboarding/group")}
          >
            SKIP FOR NOW
          </ZineButton>
        </div>

        <p className="font-typewriter text-xs text-ink/50 mt-4">
          you can always connect later from your profile
        </p>
      </PaperCard>
    </div>
  );
}
