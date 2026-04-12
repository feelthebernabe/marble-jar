"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Marble } from "../marble/marble";

interface CelebrationOverlayProps {
  isOpen: boolean;
  treatDescription: string;
  groupName: string;
  marbles: { color: string; symbol: string }[];
  onClose: () => void;
}

// Simple confetti particles using CSS
const CONFETTI_COLORS = [
  "#e8175d", "#FFD700", "#00CED1", "#FF6347",
  "#9370DB", "#32CD32", "#FF69B4", "#1E90FF",
];

function ConfettiParticle({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = `${(index * 7.3 + 5) % 100}%`;
  const delay = (index * 0.08) % 1.5;
  const duration = 2.5 + (index % 3) * 0.5;
  const rotateEnd = ((index * 137) % 720) - 360;
  const size = 8 + (index % 4) * 3;

  return (
    <motion.div
      style={{
        position: "absolute",
        top: -20,
        left,
        width: size,
        height: size * 0.6,
        backgroundColor: color,
        borderRadius: 2,
        zIndex: 201,
      }}
      initial={{ y: -20, rotate: 0, opacity: 1 }}
      animate={{
        y: typeof window !== "undefined" ? window.innerHeight + 50 : 1000,
        rotate: rotateEnd,
        opacity: [1, 1, 0.8, 0],
      }}
      transition={{
        duration,
        delay,
        ease: "easeIn",
      }}
    />
  );
}

export function CelebrationOverlay({
  isOpen,
  treatDescription,
  groupName,
  marbles,
  onClose,
}: CelebrationOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="celebration-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Confetti */}
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}

          {/* Content */}
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
            className="relative z-10 text-center"
          >
            <h1
              className="font-marker text-5xl sm:text-6xl text-white mb-4"
              style={{ transform: "rotate(-2deg)" }}
            >
              JAR FULL! 🎉
            </h1>

            <p className="font-typewriter text-lg text-white/80 mb-2">
              {groupName} did it.
            </p>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.8 }}
              className="inline-block border-3 border-white bg-punk-pink px-8 py-4 my-6 hard-shadow-pink"
              style={{ transform: "rotate(1.5deg)" }}
            >
              <p className="font-archivo text-sm text-white/80 uppercase tracking-wider mb-1">
                THE TREAT
              </p>
              <p className="font-marker text-3xl text-white">
                {treatDescription}
              </p>
            </motion.div>

            {/* All marbles parade */}
            <motion.div
              className="flex flex-wrap justify-center gap-2 max-w-md mx-auto mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {marbles.slice(0, 30).map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 1.2 + i * 0.03,
                  }}
                >
                  <Marble color={m.color} symbol={m.symbol} size={28} />
                </motion.div>
              ))}
            </motion.div>

            <button
              onClick={onClose}
              className="font-archivo uppercase font-black text-sm tracking-wider border-3 border-white px-6 py-3 bg-ink text-white hover:bg-ink/80 transition-colors"
              type="button"
            >
              START A NEW JAR →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
