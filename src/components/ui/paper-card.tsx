interface PaperCardProps {
  children: React.ReactNode;
  className?: string;
  /** Deterministic rotation index — controls the tilt angle */
  index?: number;
}

export function PaperCard({
  children,
  className = "",
  index = 0,
}: PaperCardProps) {
  // Deterministic rotation: subtle, like a pasted scrap
  const rotation = ((index * 1.7 + 0.3) % 3 - 1.5).toFixed(2);

  return (
    <div
      className={`border-3 border-ink bg-kraft-dark p-5 hard-shadow ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {children}
    </div>
  );
}
