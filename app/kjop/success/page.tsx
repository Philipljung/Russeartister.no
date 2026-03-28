"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Download, CheckCircle, Music } from "lucide-react";

type BeatInfo = {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  key: string;
  cover_url: string | null;
  producer_name: string;
};

type SessionData = {
  beat: BeatInfo;
  customerEmail: string | null;
  downloadUrl: string | null;
};

function genreColor(genre: string): string {
  const palette = ["#1a1040", "#001a2e", "#1a2e00", "#2e1a00", "#001e14", "#14001e", "#1e0a0a", "#00141e"];
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setError("Ugyldig lenke.");
      setLoading(false);
      return;
    }

    fetch(`/api/stripe/verify-session?session_id=${sessionId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Noe gikk galt.");
        } else {
          setData(json);
        }
      })
      .catch(() => setError("Kunne ikke hente kjøpsdetaljer."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "#3a3a3a" }}>Bekrefter betaling...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <p className="text-lg font-semibold" style={{ color: "#f5f5f7" }}>Noe gikk galt</p>
        <p className="text-sm" style={{ color: "#86868b" }}>{error}</p>
        <Link
          href="/later"
          className="mt-2 rounded-xl px-5 py-2 text-sm font-medium"
          style={{ background: "rgba(255,255,255,0.06)", color: "#f5f5f7" }}
        >
          Tilbake til låter
        </Link>
      </div>
    );
  }

  const { beat, customerEmail, downloadUrl } = data;
  const coverBg = beat.cover_url ? undefined : genreColor(beat.genre);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">

        {/* Success icon */}
        <div className="mb-6 flex justify-center">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 64,
              height: 64,
              background: "rgba(52,199,89,0.1)",
              border: "1px solid rgba(52,199,89,0.2)",
            }}
          >
            <CheckCircle size={28} style={{ color: "#34c759" }} />
          </div>
        </div>

        <h1
          className="mb-1 text-center text-2xl font-bold tracking-tight"
          style={{ color: "#f5f5f7" }}
        >
          Takk for kjøpet!
        </h1>
        <p className="mb-2 text-center text-sm" style={{ color: "#86868b" }}>
          {customerEmail
            ? `En kvittering er sendt til ${customerEmail}`
            : "Betaling fullført"}
        </p>
        {customerEmail && (
          <p className="mb-8 text-center text-xs" style={{ color: "#3a3a3a" }}>
            Finner du ikke e-posten? Sjekk spam-mappen.
          </p>
        )}

        {/* Beat card */}
        <div
          className="mb-6 flex items-center gap-4 rounded-2xl p-4"
          style={{ background: "#141414", border: "1px solid #2a2a2a" }}
        >
          <div
            className="shrink-0 rounded-xl"
            style={{
              width: 56,
              height: 56,
              background: coverBg,
              backgroundImage: beat.cover_url ? `url(${beat.cover_url})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            {!beat.cover_url && (
              <div className="flex h-full items-center justify-center">
                <Music size={20} style={{ color: "rgba(255,255,255,0.2)" }} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold" style={{ color: "#f5f5f7" }}>
              {beat.title}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "#86868b" }}>
              {beat.producer_name} &middot; {beat.genre} &middot; {beat.bpm} BPM
            </p>
          </div>
        </div>

        {/* Download button */}
        {downloadUrl ? (
          <a
            href={downloadUrl}
            download
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "#0071e3", color: "#fff" }}
          >
            <Download size={16} />
            Last ned
          </a>
        ) : (
          <div
            className="flex w-full items-center justify-center rounded-2xl py-3 text-sm"
            style={{ background: "rgba(255,255,255,0.04)", color: "#86868b" }}
          >
            Prosjektfil ikke tilgjengelig
          </div>
        )}

        {/* Note about expiry */}
        {downloadUrl && (
          <p className="mt-3 text-center text-xs" style={{ color: "#3a3a3a" }}>
            Nedlastningslenken er gyldig i 1 time. Du kan også laste ned via Mine Nedlastninger.
          </p>
        )}

        <Link
          href="/later"
          className="mt-6 flex w-full items-center justify-center rounded-2xl py-3 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.04)", color: "#86868b" }}
        >
          Tilbake til låter
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "#3a3a3a" }}>Bekrefter betaling...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
