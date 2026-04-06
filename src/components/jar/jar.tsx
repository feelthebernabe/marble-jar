interface JarProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export function Jar({ children, label, className = "" }: JarProps) {
  return (
    <div className={`relative inline-block ${className}`}>
      {/* Scribbled annotation */}
      <div
        className="absolute -right-32 top-8 font-typewriter text-xs text-ink/60 w-28"
        style={{ transform: "rotate(3deg)" }}
      >
        &larr; keep going!
      </div>

      {/* Lid — thick black bar */}
      <div className="relative mx-auto" style={{ width: 80 }}>
        <div
          className="h-3 bg-ink border-3 border-ink"
          style={{ borderRadius: "2px 2px 0 0" }}
        />
      </div>

      {/* Neck — narrower section */}
      <div
        className="relative mx-auto border-l-3 border-r-3 border-ink bg-kraft-dark/30"
        style={{ width: 90, height: 24 }}
      />

      {/* Body — wide hand-drawn container */}
      <div
        className="relative border-3 border-ink bg-kraft-dark/20"
        style={{
          width: 220,
          minHeight: 260,
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
        }}
      >
        {/* Marble area */}
        <div className="relative w-full h-full" style={{ minHeight: 240 }}>
          {children}
        </div>
      </div>

      {/* Label below jar */}
      {label && (
        <div
          className="font-marker text-lg text-ink text-center mt-2"
          style={{ transform: "rotate(-1deg)" }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
