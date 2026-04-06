export const SYMBOL_MAP: Record<string, string> = {
  star: "★",
  flame: "🔥",
  lightning: "⚡",
  moon: "☽",
  heart: "♥",
  spiral: "🌀",
  diamond: "◆",
  leaf: "🍃",
};

export const MARBLE_COLORS = [
  { hex: "#d94040", name: "Ruby" },
  { hex: "#2b6cb0", name: "Sapphire" },
  { hex: "#2f855a", name: "Emerald" },
  { hex: "#805ad5", name: "Amethyst" },
  { hex: "#d69e2e", name: "Topaz" },
  { hex: "#d53f8c", name: "Rose" },
  { hex: "#319795", name: "Teal" },
  { hex: "#c05621", name: "Amber" },
] as const;

export function getSymbolIcon(symbol: string): string {
  return SYMBOL_MAP[symbol] || "●";
}
