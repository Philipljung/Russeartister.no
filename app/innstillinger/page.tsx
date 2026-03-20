"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { KeyRound, LogOut, Trash2, ChevronLeft } from "lucide-react";
import Link from "next/link";

const inputStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2a2a2a",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 13,
  color: "#f5f5f7",
  outline: "none",
  width: "100%",
};

export default function InnstillingerPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Change password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: import("@supabase/supabase-js").Session | null } }) => {
      if (!session) { router.replace("/logg-inn"); return; }
      setUsername(session.user.user_metadata?.username as string ?? null);
      setLoading(false);
    });
  }, [router]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage(null);
    if (newPassword.length < 6) {
      setPwMessage({ text: "Passordet må være minst 6 tegn.", ok: false });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ text: "Passordene stemmer ikke overens.", ok: false });
      return;
    }
    setPwLoading(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      setPwMessage({ text: "Kunne ikke oppdatere passord: " + error.message, ok: false });
    } else {
      setPwMessage({ text: "Passord oppdatert!", ok: true });
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/logg-inn");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "#3a3a3a" }}>Laster...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      {/* Back link */}
      {username && (
        <Link
          href={`/profile/${username}`}
          className="mb-6 flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: "#86868b" }}
        >
          <ChevronLeft size={16} /> Tilbake til profil
        </Link>
      )}

      <h1 className="mb-8 text-2xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>
        Innstillinger
      </h1>

      {/* ── Change password ── */}
      <section
        className="mb-6 rounded-2xl p-6"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e1e" }}
      >
        <div className="mb-4 flex items-center gap-2">
          <KeyRound size={16} style={{ color: "#86868b" }} />
          <h2 className="text-sm font-semibold" style={{ color: "#f5f5f7" }}>Endre passord</h2>
        </div>

        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Nytt passord"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Bekreft nytt passord"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {pwMessage && (
            <p className="text-xs" style={{ color: pwMessage.ok ? "#34c759" : "#ff453a" }}>
              {pwMessage.text}
            </p>
          )}
          <button
            type="submit"
            disabled={pwLoading}
            className="rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "#6366f1", color: "#fff" }}
          >
            {pwLoading ? "Lagrer..." : "Oppdater passord"}
          </button>
        </form>
      </section>

      {/* ── Sign out ── */}
      <section
        className="mb-6 rounded-2xl p-6"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e1e" }}
      >
        <div className="mb-4 flex items-center gap-2">
          <LogOut size={16} style={{ color: "#86868b" }} />
          <h2 className="text-sm font-semibold" style={{ color: "#f5f5f7" }}>Logg ut</h2>
        </div>
        <p className="mb-4 text-xs" style={{ color: "#86868b" }}>
          Du vil bli logget ut av kontoen din på denne enheten.
        </p>
        <button
          onClick={handleSignOut}
          className="rounded-xl px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.25)", color: "#ff3b30" }}
        >
          Logg ut
        </button>
      </section>

      {/* ── Danger zone ── */}
      <section
        className="rounded-2xl p-6"
        style={{ background: "rgba(255,59,48,0.03)", border: "1px solid rgba(255,59,48,0.12)" }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Trash2 size={16} style={{ color: "#ff3b30" }} />
          <h2 className="text-sm font-semibold" style={{ color: "#ff3b30" }}>Slett konto</h2>
        </div>
        <p className="mb-4 text-xs" style={{ color: "#86868b" }}>
          Sletting av konto er permanent og kan ikke angres. Kontakt oss på{" "}
          <a href="mailto:russeartister@gmail.com" className="underline" style={{ color: "#86868b" }}>
            russeartister@gmail.com
          </a>{" "}
          for å slette kontoen din.
        </p>
      </section>
    </div>
  );
}
