import { getSymbolIcon } from "@/lib/constants";

interface MarbleProps {
  color: string;
  symbol: string;
  size?: number;
  className?: string;
}

/**
 * Glass marble with 3D depth, highlights, and reflections.
 * Designed to feel physical — like a real marble sitting on a counter.
 */
export function Marble({ color, symbol, size = 48, className = "" }: MarbleProps) {
  const fontSize = Math.round(size * 0.38);
  const highlightSize = Math.round(size * 0.3);

  return (
    <span
      className={`marble-glass ${className}`}
      style={{
        width: size,
        height: size,
        fontSize,
        // Rich radial gradient: bright center → deep saturated edges
        background: `
          radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.0) ${highlightSize}px),
          radial-gradient(circle at 65% 75%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.0) ${size * 0.5}px),
          radial-gradient(circle at 50% 50%, ${color} 0%, ${color}dd 60%, ${color}88 100%)
        `,
        borderColor: `${color}99`,
      }}
      aria-label={`${symbol} marble`}
    >
      <span className="marble-symbol">{getSymbolIcon(symbol)}</span>
    </span>
  );
}
