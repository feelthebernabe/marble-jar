"use client";

import { Jar } from "./jar";
import { MarbleDrop } from "../marble/marble-drop";

interface MarbleData {
  id: string;
  color: string;
  symbol: string;
  isNew?: boolean;
}

interface JarWithMarblesProps {
  marbles: MarbleData[];
  capacity: number;
  label?: string;
}

const MARBLE_SIZE = 36;
const JAR_WIDTH = 220;
const PADDING = 10;

function calculatePositions(count: number) {
  const positions: { x: number; y: number; rotate: number }[] = [];
  const cols = Math.floor((JAR_WIDTH - PADDING * 2) / (MARBLE_SIZE + 4));
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // Offset every other row for a packed look
    const offsetX = row % 2 === 1 ? (MARBLE_SIZE + 4) / 2 : 0;
    const x = PADDING + col * (MARBLE_SIZE + 4) + offsetX;
    const y = PADDING + row * (MARBLE_SIZE + 2);
    // Deterministic slight rotation based on index
    const rotate = ((i * 7 + 3) % 5) - 2;
    positions.push({ x, y, rotate });
  }
  return positions;
}

export function JarWithMarbles({ marbles, capacity, label }: JarWithMarblesProps) {
  const positions = calculatePositions(marbles.length);
  const fillPercent = capacity > 0 ? Math.round((marbles.length / capacity) * 100) : 0;

  return (
    <div className="flex flex-col items-center">
      <Jar label={label}>
        {marbles.map((marble, i) => {
          const pos = positions[i];
          return (
            <MarbleDrop
              key={marble.id}
              color={marble.color}
              symbol={marble.symbol}
              size={MARBLE_SIZE}
              targetX={pos.x}
              targetY={pos.y}
              rotate={pos.rotate}
              isNew={marble.isNew}
              delay={marble.isNew ? i * 0.05 : 0}
            />
          );
        })}
      </Jar>

      {/* Fill stats */}
      <div className="mt-4 text-center">
        <span className="font-marker text-2xl text-ink">
          {marbles.length} / {capacity}
        </span>
        <span
          className="font-typewriter text-sm text-ink/60 ml-3"
          style={{ transform: "rotate(1deg)", display: "inline-block" }}
        >
          {fillPercent}% full
        </span>
      </div>
    </div>
  );
}
