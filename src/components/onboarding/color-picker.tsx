"use client";

const COLORS = [
  { name: "Ruby", hex: "#d94040" },
  { name: "Sapphire", hex: "#2b6cb0" },
  { name: "Emerald", hex: "#2f855a" },
  { name: "Amethyst", hex: "#805ad5" },
  { name: "Topaz", hex: "#d69e2e" },
  { name: "Rose", hex: "#d53f8c" },
  { name: "Teal", hex: "#319795" },
  { name: "Amber", hex: "#c05621" },
] as const;

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {COLORS.map((color, i) => {
        const rotation = ((i * 1.7 + 0.3) % 3 - 1.5).toFixed(2);
        const selected = value === color.hex;

        return (
          <button
            key={color.hex}
            type="button"
            onClick={() => onChange(color.hex)}
            className="flex flex-col items-center gap-1 p-2"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <span
              className={`stamp ${selected ? "border-3 border-ink hard-shadow" : ""}`}
              style={{
                backgroundColor: color.hex,
                width: 48,
                height: 48,
                borderColor: selected ? "var(--color-ink)" : color.hex,
              }}
            />
            <span className="font-typewriter text-xs text-ink">{color.name}</span>
          </button>
        );
      })}
    </div>
  );
}
