"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";
import { ProgressDots } from "@/components/ui/progress-dots";
import { TapeDivider } from "@/components/ui/tape-divider";

const JAR_CATEGORIES = [
  {
    key: "WORKOUT" as const,
    emoji: "\uD83D\uDCAA",
    label: "workout",
    desc: "Strava auto-tracks, or text what you did",
  },
  {
    key: "MEDITATION" as const,
    emoji: "\uD83E\uDDD8",
    label: "meditation",
    desc: "Text when you've sat",
  },
  {
    key: "CUSTOM" as const,
    emoji: "\u2728",
    label: "custom",
    desc: "Define your own daily goal",
  },
];

interface JarDraft {
  category: "WORKOUT" | "MEDITATION" | "CUSTOM";
  treatDescription: string;
  capacity: number;
  goalDescription?: string;
}

export default function JarsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");

  const [jars, setJars] = useState<JarDraft[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [goalDescription, setGoalDescription] = useState("");
  const [treatDescription, setTreatDescription] = useState("");
  const [capacity, setCapacity] = useState("60");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addJar() {
    if (!selectedCategory || !treatDescription.trim()) return;
    const newJar: JarDraft = {
      category: selectedCategory as JarDraft["category"],
      treatDescription: treatDescription.trim(),
      capacity: parseInt(capacity) || 60,
    };
    if (selectedCategory === "CUSTOM" && goalDescription.trim()) {
      newJar.goalDescription = goalDescription.trim();
    }
    setJars((prev) => [...prev, newJar]);
    resetForm();
  }

  function resetForm() {
    setSelectedCategory(null);
    setGoalDescription("");
    setTreatDescription("");
    setCapacity("60");
  }

  function removeJar(index: number) {
    setJars((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/jars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, jars }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const catInfo = JAR_CATEGORIES.find((c) => c.key === selectedCategory);

  return (
    <div>
      <ProgressDots total={5} current={4} className="mb-6" />

      <PaperCard index={4} className="p-6">
        <h2
          className="font-marker text-2xl text-ink mb-1"
          style={{ transform: "rotate(-1.2deg)" }}
        >
          fill your jars
        </h2>
        <p className="font-typewriter text-sm text-ink/70 mb-4">
          each jar is a shared goal. pick what your crew is tracking.
        </p>

        {/* Already-added jars */}
        {jars.length > 0 && (
          <div className="space-y-2 mb-4">
            {jars.map((jar, i) => {
              const rotation = ((i * 1.7 + 0.3) % 3 - 1.5).toFixed(2);
              const cat = JAR_CATEGORIES.find((c) => c.key === jar.category);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between bg-ink text-white px-3 py-2 border-3 border-ink font-typewriter text-sm"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <span>
                    {cat?.emoji} {jar.category.toLowerCase()}
                    {jar.goalDescription ? ` — ${jar.goalDescription}` : ""}
                    {" "}({jar.capacity} marbles)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeJar(i)}
                    className="text-white/70 hover:text-white cursor-pointer text-base ml-2"
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <TapeDivider index={6} />

        {/* Category selection */}
        {!selectedCategory && (
          <div>
            <p className="font-archivo text-xs uppercase tracking-wider text-ink mb-3">
              add a jar:
            </p>
            <div className="flex flex-col gap-2">
              {JAR_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className="text-left border-3 border-ink bg-kraft px-4 py-3 cursor-pointer hover:bg-kraft-dark"
                >
                  <span className="font-archivo text-sm">
                    {cat.emoji} {cat.label}
                  </span>
                  <span className="font-typewriter text-xs text-ink/60 block mt-0.5">
                    {cat.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Jar form */}
        {selectedCategory && catInfo && (
          <div>
            <p className="font-archivo text-sm uppercase tracking-wider text-ink mb-3">
              {catInfo.emoji} new {catInfo.label} jar
            </p>

            {selectedCategory === "CUSTOM" && (
              <InkInput
                label="What's the goal?"
                placeholder="e.g. read 30 minutes a day"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                className="mb-3"
              />
            )}

            <InkInput
              label="What's the treat?"
              placeholder="e.g. group dinner at Nando's"
              value={treatDescription}
              onChange={(e) => setTreatDescription(e.target.value)}
              className="mb-3"
            />

            <InkInput
              label="Marble target"
              type="number"
              placeholder="60"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="mb-4"
            />

            <div className="flex gap-3">
              <ZineButton variant="secondary" onClick={resetForm}>
                CANCEL
              </ZineButton>
              <ZineButton
                variant="primary"
                onClick={addJar}
                disabled={!treatDescription.trim()}
              >
                ADD JAR
              </ZineButton>
            </div>
          </div>
        )}

        {error && (
          <p className="font-typewriter text-sm text-punk-pink mt-3">{error}</p>
        )}

        {jars.length > 0 && !selectedCategory && (
          <div className="mt-6">
            <ZineButton
              variant="primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? "SAVING..."
                : `LET'S GO \u2014 ${jars.length} JAR${jars.length !== 1 ? "S" : ""} READY`}
            </ZineButton>
          </div>
        )}
      </PaperCard>
    </div>
  );
}
