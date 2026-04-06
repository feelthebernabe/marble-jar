"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";

type PageState = "form" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<PageState>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/auth/callback",
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      setState("error");
    } else {
      setState("sent");
    }
  }

  return (
    <div className="min-h-screen bg-kraft flex flex-col items-center justify-center px-4">
      {/* Title */}
      <h1
        className="font-marker text-5xl sm:text-6xl text-ink mb-2 select-none"
        style={{ transform: "rotate(-2.5deg)" }}
      >
        marble jar
      </h1>
      <p className="font-typewriter text-ink/70 text-lg mb-10 text-center">
        fill the jar together. earn the treat.
      </p>

      {/* Card */}
      <PaperCard index={3} className="w-full max-w-sm p-8">
        {state === "form" || state === "error" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex flex-col gap-6"
          >
            <InkInput
              label="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state === "error") setState("form");
              }}
            />

            {state === "error" && (
              <p className="font-typewriter text-punk-pink text-sm -mt-2">
                {errorMsg || "something went wrong. try again."}
              </p>
            )}

            <ZineButton type="submit" variant="primary" disabled={loading}>
              {loading ? "SENDING..." : "SEND MAGIC LINK"}
            </ZineButton>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="font-archivo text-2xl text-ink uppercase tracking-wide">
              Check your email
            </p>
            <p className="font-typewriter text-ink/70">
              we sent a magic link to
            </p>
            <p className="font-typewriter text-ink font-bold break-all">
              {email}
            </p>
            <ZineButton
              variant="secondary"
              onClick={() => {
                setState("form");
                setEmail("");
              }}
            >
              TRY ANOTHER EMAIL
            </ZineButton>
          </div>
        )}
      </PaperCard>
    </div>
  );
}
