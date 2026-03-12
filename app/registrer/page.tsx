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

function slugify(val: string) {
  return val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export default function RegistrerPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log("[registrer] Attempting sign up — email:", email, "username:", username);

    const supabase = getSupabaseClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // These values are written to auth.users.raw_user_meta_data.
        // The handle_new_user() DB trigger reads them to create the profile row.
        data: {
          username,
          display_name: displayName,
        },
      },
    });

    console.log(
      "[registrer] signUp result — user:", data.user?.email ?? "null",
      "identities:", data.user?.identities?.length ?? "n/a",
      "session:", data.session ? "yes" : "no",
      "error:", signUpError?.message ?? "none"
    );

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    // Supabase silently "succeeds" on duplicate email (prevents email enumeration).
    // We detect it by checking identities — a real new user has at least 1 identity.
    if (data.user && data.user.identities?.length === 0) {
      console.warn("[registrer] Duplicate email detected (empty identities array)");
      setLoading(false);
      setError("E-postadressen er allerede i bruk.");
      return;
    }

    if (!data.user) {
      setLoading(false);
      setError("Registrering mislyktes. Prøv igjen.");
      return;
    }

    // If email confirmation is DISABLED in Supabase: data.session is non-null → redirect now.
    // If email confirmation is ENABLED: data.session is null → ask user to check email.
    if (data.session) {
      console.log("[registrer] Session created immediately — redirecting to /profile/" + username);
      router.push(`/profile/${username}`);
      return;
    }

    console.log("[registrer] Email confirmation required — user must confirm before logging in");
    setLoading(false);
    setError("Sjekk e-posten din og klikk på bekreftelseslenken, og logg deretter inn.");
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
          Opprett konto
        </h1>
        <p className="mb-8 text-center text-sm" style={{ color: "#86868b" }}>
          Har du allerede konto?{" "}
          <Link href="/logg-inn" style={{ color: "#f5f5f7" }}>
            Logg inn
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Artistnavn / visningsnavn"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (!username) setUsername(slugify(e.target.value));
            }}
            required
            style={inputStyle}
          />

          <div>
            <input
              type="text"
              placeholder="Brukernavn (f.eks. ljung)"
              value={username}
              onChange={(e) => setUsername(slugify(e.target.value))}
              required
              style={inputStyle}
            />
            <p className="mt-1 text-xs" style={{ color: "#86868b" }}>
              russeartister.no/profile/{username || "brukernavn"}
            </p>
          </div>

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
            placeholder="Passord (min. 6 tegn)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <p
              className="text-sm"
              style={{ color: error.startsWith("Sjekk") ? "#34c759" : "#ff453a" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "#f5f5f7", color: "#080808" }}
          >
            {loading ? "Oppretter konto..." : "Registrer deg"}
          </button>
        </form>
      </div>
    </div>
  );
}
