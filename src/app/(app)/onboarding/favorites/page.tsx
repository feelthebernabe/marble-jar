import { PaperCard } from "@/components/ui/paper-card";
import { ProgressDots } from "@/components/ui/progress-dots";
import { FavoritesForm } from "@/components/onboarding/favorites-form";

export default function FavoritesPage() {
  return (
    <div>
      <ProgressDots total={6} current={2} className="mb-6" />

      <PaperCard index={2} className="p-6">
        <h2
          className="font-marker text-2xl text-ink mb-1"
          style={{ transform: "rotate(0.7deg)" }}
        >
          what do you love?
        </h2>
        <p className="font-typewriter text-sm text-ink/70 mb-5">
          your favorites feed the agent&apos;s personality. it&apos;ll weave your
          movies, books, and poets into the texts it sends your friends.
        </p>

        <FavoritesForm />
      </PaperCard>
    </div>
  );
}
