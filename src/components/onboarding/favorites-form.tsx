"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";

const CATEGORIES = [
  { key: "movies", emoji: "\uD83C\uDFAC", label: "movies" },
  { key: "shows", emoji: "\uD83D\uDCFA", label: "shows" },
  { key: "books", emoji: "\uD83D\uDCDA", label: "books" },
  { key: "music", emoji: "\uD83C\uDFB5", label: "music" },
  { key: "poets", emoji: "\u270D\uFE0F", label: "poets" },
] as const;

interface Favorite {
  category: string;
  value: string;
}

export function FavoritesForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("movies");
  const [input, setInput] = useState("");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addFavorite() {
    if (!input.trim()) return;
    setFavorites((prev) => [...prev, { category: activeTab, value: input.trim() }]);
    setInput("");
  }

  function removeFavorite(index: number) {
    setFavorites((prev) => prev.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addFavorite();
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorites }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }
      router.push("/onboarding/group");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveTab(cat.key)}
            className={`font-archivo text-xs uppercase tracking-wider px-3 py-2 border-3 border-ink cursor-pointer ${
              activeTab === cat.key
                ? "bg-punk-pink text-white"
                : "bg-kraft text-ink"
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex gap-2 items-end mb-4">
        <div className="flex-1">
          <InkInput
            label={`add a ${activeTab.slice(0, -1)}`}
            placeholder={`your fav ${activeTab.slice(0, -1)}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <div onKeyDown={handleKeyDown}>
          <ZineButton variant="secondary" onClick={addFavorite} disabled={!input.trim()}>
            +
          </ZineButton>
        </div>
      </div>

      {/* Tags */}
      {favorites.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {favorites.map((fav, i) => {
            const rotation = ((i * 1.7 + 0.3) % 3 - 1.5).toFixed(2);
            const cat = CATEGORIES.find((c) => c.key === fav.category);
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-ink text-white font-typewriter text-sm px-3 py-1 border-3 border-ink"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                {cat?.emoji} {fav.value}
                <button
                  type="button"
                  onClick={() => removeFavorite(i)}
                  className="ml-1 text-white/70 hover:text-white cursor-pointer text-base leading-none"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}

      {error && (
        <p className="font-typewriter text-sm text-punk-pink mb-3">{error}</p>
      )}

      <ZineButton
        variant="primary"
        onClick={handleSubmit}
        disabled={favorites.length === 0 || loading}
      >
        {loading
          ? "SAVING..."
          : `CONTINUE WITH ${favorites.length} FAVORITE${favorites.length !== 1 ? "S" : ""}`}
      </ZineButton>
    </div>
  );
}
