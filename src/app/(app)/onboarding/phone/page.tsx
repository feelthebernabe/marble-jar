"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";
import { ProgressDots } from "@/components/ui/progress-dots";

export default function PhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      router.push("/onboarding/favorites");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <ProgressDots total={6} current={1} className="mb-6" />

      <PaperCard index={1} className="p-6">
        <h2
          className="font-marker text-2xl text-ink mb-1"
          style={{ transform: "rotate(-0.6deg)" }}
        >
          your number
        </h2>
        <p className="font-typewriter text-sm text-ink/70 mb-4">
          this is how you&apos;ll talk to the marble jar agent. text it your
          workouts, your meditations, your excuses.
        </p>

        <InkInput
          label="Phone number"
          type="tel"
          placeholder="+1 555 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {error && (
          <p className="font-typewriter text-sm text-punk-pink mt-3">{error}</p>
        )}

        <div className="mt-6">
          <ZineButton
            variant="primary"
            onClick={handleSubmit}
            disabled={!phone.trim() || loading}
          >
            {loading ? "SAVING..." : "NEXT"}
          </ZineButton>
        </div>
      </PaperCard>
    </div>
  );
}
