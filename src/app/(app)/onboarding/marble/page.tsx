"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";
import { ProgressDots } from "@/components/ui/progress-dots";
import { TapeDivider } from "@/components/ui/tape-divider";
import { ColorPicker } from "@/components/onboarding/color-picker";
import { SymbolPicker } from "@/components/onboarding/symbol-picker";

type Step = "name" | "color" | "symbol";

export default function MarblePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/marble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, symbol }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }
      router.push("/onboarding/phone");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <ProgressDots total={5} current={0} className="mb-6" />

      <PaperCard index={0} className="p-6">
        {step === "name" && (
          <div>
            <h2 className="font-marker text-2xl text-ink mb-1" style={{ transform: "rotate(-0.8deg)" }}>
              what do they call you?
            </h2>
            <p className="font-typewriter text-sm text-ink/70 mb-4">
              this goes on your marble. make it count.
            </p>
            <InkInput
              label="Name"
              placeholder="your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="mt-6">
              <ZineButton
                variant="primary"
                onClick={() => setStep("color")}
                disabled={!name.trim()}
              >
                NEXT
              </ZineButton>
            </div>
          </div>
        )}

        {step === "color" && (
          <div>
            <h2 className="font-marker text-2xl text-ink mb-1" style={{ transform: "rotate(0.6deg)" }}>
              pick your colour
            </h2>
            <p className="font-typewriter text-sm text-ink/70 mb-4">
              every marble needs a look.
            </p>
            <ColorPicker value={color} onChange={setColor} />
            <TapeDivider index={1} />
            <div className="flex gap-3">
              <ZineButton variant="secondary" onClick={() => setStep("name")}>
                BACK
              </ZineButton>
              <ZineButton
                variant="primary"
                onClick={() => setStep("symbol")}
                disabled={!color}
              >
                NEXT
              </ZineButton>
            </div>
          </div>
        )}

        {step === "symbol" && (
          <div>
            <h2 className="font-marker text-2xl text-ink mb-1" style={{ transform: "rotate(-1.1deg)" }}>
              choose your mark
            </h2>
            <p className="font-typewriter text-sm text-ink/70 mb-4">
              stamped on every marble you earn.
            </p>
            <SymbolPicker value={symbol} onChange={setSymbol} />

            {color && (
              <>
                <TapeDivider index={2} />
                <div className="flex items-center gap-4">
                  <p className="font-typewriter text-sm text-ink/70">your marble:</p>
                  <span
                    className="stamp"
                    style={{
                      backgroundColor: color,
                      color: "#fff",
                      fontSize: 22,
                    }}
                  >
                    {symbol || "?"}
                  </span>
                </div>
              </>
            )}

            <TapeDivider index={3} />

            {error && (
              <p className="font-typewriter text-sm text-punk-pink mb-3">{error}</p>
            )}

            <div className="flex gap-3">
              <ZineButton variant="secondary" onClick={() => setStep("color")}>
                BACK
              </ZineButton>
              <ZineButton
                variant="primary"
                onClick={handleSubmit}
                disabled={!symbol || loading}
              >
                {loading ? "SAVING..." : "NEXT"}
              </ZineButton>
            </div>
          </div>
        )}
      </PaperCard>
    </div>
  );
}
