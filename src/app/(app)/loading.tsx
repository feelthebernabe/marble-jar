export default function AppLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1
        className="font-marker text-4xl text-ink mb-4 select-none animate-pulse"
        style={{ transform: "rotate(-2deg)" }}
      >
        marble jar
      </h1>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full bg-punk-pink animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
