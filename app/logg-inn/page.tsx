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

    const supabase = getSupabaseClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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

        {/* Google */}
        <button
          type="button"
          onClick={() => {
            const supabase = getSupabaseClient();
            void supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: window.location.origin + "/auth/callback" },
            });
          }}
          className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "#fff", color: "#080808", border: "1px solid #e5e5e5" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Fortsett med Google
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: "#1e1e1e" }} />
          <span className="text-xs" style={{ color: "#3a3a3a" }}>eller</span>
          <div className="h-px flex-1" style={{ background: "#1e1e1e" }} />
        </div>

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
