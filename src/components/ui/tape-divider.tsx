interface TapeDividerProps {
  className?: string;
  /** Deterministic rotation index */
  index?: number;
}

export function TapeDivider({ className = "", index = 0 }: TapeDividerProps) {
  const rotation = ((index * 2.1 + 0.5) % 2 - 1).toFixed(2);

  return (
    <div
      className={`relative my-6 ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* Main thick marker line */}
      <div className="h-1 bg-ink" />
      {/* Second slightly offset line — like a shaky hand drew it twice */}
      <div
        className="h-[2px] bg-ink/60 mt-[1px]"
        style={{ marginLeft: "3px", marginRight: "-2px" }}
      />
    </div>
  );
}
