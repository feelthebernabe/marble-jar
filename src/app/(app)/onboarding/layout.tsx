export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-kraft flex flex-col items-center px-4 py-10">
      <h1
        className="font-marker text-4xl sm:text-5xl text-ink mb-8 select-none"
        style={{ transform: "rotate(-2.1deg)" }}
      >
        marble jar
      </h1>
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
