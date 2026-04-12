"use client";

import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <PaperCard index={1} className="max-w-sm w-full p-8 text-center">
        <h1
          className="font-marker text-3xl text-ink mb-3"
          style={{ transform: "rotate(-1.5deg)" }}
        >
          WHOOPS
        </h1>
        <p className="font-typewriter text-sm text-ink/60 mb-6">
          Something broke. The marbles are rolling around on the floor.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-ink/30 mb-4">
            Error: {error.digest}
          </p>
        )}
        <ZineButton variant="primary" onClick={reset}>
          TRY AGAIN
        </ZineButton>
      </PaperCard>
    </div>
  );
}
