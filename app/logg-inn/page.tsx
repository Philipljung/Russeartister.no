"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

const inputStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2a2a2a",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 14,
  color: "#f5f5f7",
  outline: "none",
  width: "100%",
};

export default function LoggInnPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log("[logg-inn] Attempting sign in for:", email);

    const supabase = getSupabaseClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log(
      "[logg-inn] Result — user:",
      data.user?.email ?? "null",
      "error:",
      signInError?.message ?? "none"
    );

    if (signInError) {
      setLoading(false);
      setError("Feil e-post eller passord.");
      return;
    }

    if (!data.user) {
      setLoading(false);
      setError("Innlogging mislyktes. Prøv igjen.");
      return;
    }

    // Use the username stored in auth metadata — no extra DB call needed.
    const username = data.user.user_metadata?.username as string | undefined;
    console.log("[logg-inn] Success. Username from metadata:", username);

    if (username) {
      router.push(`/profile/${username}`);
    } else {
      console.warn("[logg-inn] No username in metadata, redirecting to /beats");
      router.push("/beats");
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "#080808" }}
    >
      <div className="w-full max-w-sm">
        <h1
          className="mb-2 text-center text-2xl font-bold tracking-tight"
          style={{ color: "#f5f5f7" }}
        >
          Logg inn
        </h1>
        <p className="mb-8 text-center text-sm" style={{ color: "#86868b" }}>
          Har du ikke konto?{" "}
          <Link href="/registrer" style={{ color: "#f5f5f7" }}>
            Registrer deg
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="E-post"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Passord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          {error && (
            <p className="text-sm" style={{ color: "#ff453a" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "#f5f5f7", color: "#080808" }}
          >
            {loading ? "Logger inn..." : "Logg inn"}
          </button>
        </form>
      </div>
    </div>
  );
}
