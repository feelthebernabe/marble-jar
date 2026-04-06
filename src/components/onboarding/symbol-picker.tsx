"use client";

const SYMBOLS = [
  { symbol: "\u2605", label: "star" },
  { symbol: "\uD83D\uDD25", label: "flame" },
  { symbol: "\u26A1", label: "lightning" },
  { symbol: "\u263D", label: "moon" },
  { symbol: "\u2665", label: "heart" },
  { symbol: "\uD83C\uDF00", label: "spiral" },
  { symbol: "\u25C6", label: "diamond" },
  { symbol: "\uD83C\uDF43", label: "leaf" },
] as const;

interface SymbolPickerProps {
  value: string;
  onChange: (symbol: string) => void;
}

export function SymbolPicker({ value, onChange }: SymbolPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {SYMBOLS.map((item, i) => {
        const rotation = ((i * 1.7 + 0.3) % 3 - 1.5).toFixed(2);
        const selected = value === item.symbol;

        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onChange(item.symbol)}
            className="flex flex-col items-center gap-1 p-2"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <span
              className={`stamp ${selected ? "hard-shadow" : ""}`}
              style={{
                borderColor: selected ? "var(--color-ink)" : undefined,
                borderWidth: selected ? 3 : undefined,
              }}
            >
              {item.symbol}
            </span>
            <span className="font-typewriter text-xs text-ink">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
