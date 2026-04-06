import { getSymbolIcon } from "@/lib/constants";

interface MarbleProps {
  color: string;
  symbol: string;
  size?: number;
  className?: string;
}

export function Marble({ color, symbol, size = 48, className = "" }: MarbleProps) {
  const scale = size / 48;
  const fontSize = Math.round(18 * scale);

  return (
    <span
      className={`stamp ${className}`}
      style={{
        width: size,
        height: size,
        fontSize,
        backgroundColor: color,
        color: "#ffffff",
      }}
      aria-label={`${symbol} marble`}
    >
      {getSymbolIcon(symbol)}
    </span>
  );
}
