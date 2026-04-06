import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";
import { ProgressDots } from "@/components/ui/progress-dots";
import { TapeDivider } from "@/components/ui/tape-divider";

function Ransom({ text }: { text: string }) {
  return (
    <span className="ransom">
      {text.split(" ").map((word, i) => (
        <span key={i}>{word}</span>
      ))}
    </span>
  );
}

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Typography showcase */}
      <h1 className="font-marker text-5xl text-ink mb-2 -rotate-1">
        MARBLE JAR
      </h1>
      <h2 className="font-archivo text-2xl text-punk-pink mb-4 rotate-[0.5deg]">
        FRIEND ACCOUNTABILITY
      </h2>
      <p className="font-typewriter text-ink mb-2">
        This is body text in Special Elite. It looks like it was typed on a
        busted typewriter found in a skip behind the Roxy. Every letter slightly
        off, slightly wrong. Perfect.
      </p>
      <p className="font-mono text-sm text-ink/70 mb-8">
        monospace details in Courier Prime -- timestamps, codes, the small print
      </p>

      <TapeDivider index={0} />

      {/* Ransom note */}
      <div className="mb-8">
        <p className="text-xl leading-relaxed">
          <Ransom text="keep your promises or lose your marbles" />
        </p>
      </div>

      <TapeDivider index={1} />

      {/* Paper cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
        <PaperCard index={0}>
          <h3 className="font-marker text-xl mb-2">WEEKLY CHECK-IN</h3>
          <p className="font-typewriter text-sm">
            Did you actually go to the gym or are you lying to your mates again?
          </p>
          <div className="flex gap-2 mt-3">
            <span className="stamp">+</span>
            <span className="stamp stamp--pink">!</span>
            <span className="stamp stamp--filled">X</span>
          </div>
        </PaperCard>

        <PaperCard index={1}>
          <h3 className="font-marker text-xl mb-2">THE PACT</h3>
          <p className="font-typewriter text-sm">
            3 marbles in. Break a promise, one comes out. Empty jar = you buy
            everyone chips.
          </p>
        </PaperCard>

        <PaperCard index={2}>
          <h3 className="font-archivo text-lg mb-2 text-punk-pink">
            NO EXCUSES
          </h3>
          <p className="font-typewriter text-sm">
            Your friends are watching. The jar doesn&apos;t lie.
          </p>
        </PaperCard>
      </div>

      <TapeDivider index={2} />

      {/* Buttons */}
      <div className="flex flex-wrap gap-4 mb-8">
        <ZineButton variant="primary">ADD MARBLE</ZineButton>
        <ZineButton variant="secondary">REMOVE MARBLE</ZineButton>
      </div>

      <TapeDivider index={3} />

      {/* Input */}
      <div className="max-w-sm mb-8">
        <InkInput label="Your Name" placeholder="type here..." />
      </div>

      <TapeDivider index={4} />

      {/* Progress dots */}
      <div className="space-y-4 mb-8">
        <div>
          <p className="font-typewriter text-sm mb-2">Step 1 of 5:</p>
          <ProgressDots total={5} current={0} />
        </div>
        <div>
          <p className="font-typewriter text-sm mb-2">Step 3 of 5:</p>
          <ProgressDots total={5} current={2} />
        </div>
        <div>
          <p className="font-typewriter text-sm mb-2">Step 5 of 5 (done):</p>
          <ProgressDots total={5} current={4} />
        </div>
      </div>

      <TapeDivider index={5} />

      <p className="font-marker text-center text-3xl text-punk-pink -rotate-2 mt-8">
        DIY OR DIE
      </p>
    </div>
  );
}
