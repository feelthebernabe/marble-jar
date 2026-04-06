"use client";

import { motion } from "framer-motion";
import { Marble } from "./marble";

interface MarbleDropProps {
  color: string;
  symbol: string;
  size?: number;
  delay?: number;
  targetY: number;
  targetX: number;
  rotate?: number;
  isNew?: boolean;
}

export function MarbleDrop({
  color,
  symbol,
  size = 48,
  delay = 0,
  targetY,
  targetX,
  rotate = 0,
  isNew = false,
}: MarbleDropProps) {
  if (!isNew) {
    return (
      <div
        className="absolute"
        style={{
          left: targetX,
          bottom: targetY,
          transform: `rotate(${rotate}deg)`,
        }}
      >
        <Marble color={color} symbol={symbol} size={size} />
      </div>
    );
  }

  return (
    <motion.div
      className="absolute"
      style={{ left: targetX }}
      initial={{ bottom: targetY + 400, rotate: rotate - 15 }}
      animate={{ bottom: targetY, rotate }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay,
      }}
    >
      <Marble color={color} symbol={symbol} size={size} />
    </motion.div>
  );
}
