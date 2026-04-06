"use client";

import { useState } from "react";

interface ZineButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function ZineButton({
  children,
  className = "",
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
}: ZineButtonProps) {
  const [pressed, setPressed] = useState(false);

  const base =
    "font-archivo uppercase font-black text-sm tracking-wider border-3 border-ink px-5 py-3 cursor-pointer select-none transition-none";

  const variants = {
    primary: "bg-punk-pink text-white hover:bg-punk-pink-dark",
    secondary: "bg-ink text-white hover:bg-zinc-800",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className={`${base} ${variants[variant]} ${className}`}
      style={{
        boxShadow: pressed ? "none" : "3px 3px 0 0 var(--color-ink)",
        transform: pressed ? "translate(3px, 3px)" : "translate(0, 0)",
      }}
    >
      {children}
    </button>
  );
}
