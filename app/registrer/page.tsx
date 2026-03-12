"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    router.push(`/profile/${username || "ljung"}`);
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
