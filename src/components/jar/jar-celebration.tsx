"use client";

import { useState } from "react";
import { CelebrationOverlay } from "./celebration-overlay";

interface JarCelebrationProps {
  isFull: boolean;
  treatDescription: string;
  groupName: string;
  marbles: { color: string; symbol: string }[];
}

export function JarCelebration({
  isFull,
  treatDescription,
  groupName,
  marbles,
}: JarCelebrationProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!isFull || dismissed) return null;

  return (
    <CelebrationOverlay
      isOpen={true}
      treatDescription={treatDescription}
      groupName={groupName}
      marbles={marbles}
      onClose={() => setDismissed(true)}
    />
  );
}
