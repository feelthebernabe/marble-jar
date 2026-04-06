interface ProgressDotsProps {
  /** Total number of steps */
  total: number;
  /** Current step (0-indexed) */
  current: number;
  className?: string;
}

export function ProgressDots({
  total,
  current,
  className = "",
}: ProgressDotsProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {Array.from({ length: total }, (_, i) => {
        // Deterministic variation per dot
        const size = 12 + ((i * 3 + 1) % 5); // 12-16px
        const offsetY = ((i * 2.3 + 0.7) % 3 - 1.5).toFixed(1); // -1.5 to 1.5px
        const rotation = ((i * 1.7 + 0.3) % 3 - 1.5).toFixed(1);

        const isFilled = i < current;
        const isCurrent = i === current;

        return (
          <span
            key={i}
            style={{
              width: size,
              height: size,
              transform: `translateY(${offsetY}px) rotate(${rotation}deg)`,
              borderWidth: isCurrent ? 3 : 2,
            }}
            className={`inline-block rounded-full border-ink transition-none ${
              isCurrent
                ? "bg-punk-pink border-punk-pink"
                : isFilled
                  ? "bg-ink border-ink"
                  : "bg-transparent border-ink"
            }`}
          />
        );
      })}
    </div>
  );
}
