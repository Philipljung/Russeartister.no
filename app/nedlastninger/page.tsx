"use client";

import { Download, Music, Package } from "lucide-react";
import { MOCK_BEATS } from "@/lib/mock-data";

function genreColor(genre: string): string {
  const palette = ["#1a1040", "#001a2e", "#1a2e00", "#2e1a00", "#001e14", "#14001e", "#1e0a0a", "#00141e"];
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

// Mock purchases — the first 2 beats are "bought"
const MOCK_PURCHASED_BEATS = MOCK_BEATS.slice(0, 2);

export default function NedlastningerPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1
        className="mb-1 text-2xl font-bold tracking-tight"
        style={{ color: "#f5f5f7" }}
      >
        Mine nedlastninger
      </h1>
      <p className="mb-10 text-sm" style={{ color: "#86868b" }}>
        Beats og samples du har kjøpt
      </p>

      {/* ── Kjøpte beats ── */}
      <section className="mb-12">
        <h2
          className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight"
          style={{ color: "#f5f5f7" }}
        >
          <Music size={16} style={{ color: "#86868b" }} />
          Kjøpte Beats
        </h2>

        {MOCK_PURCHASED_BEATS.length === 0 ? (
          <EmptyState label="Ingen kjøpte beats enda" />
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid #1e1e1e" }}
          >
            {MOCK_PURCHASED_BEATS.map((beat, i) => (
              <div
                key={beat.id}
                className="flex items-center gap-4 px-5 py-3.5"
                style={{
                  borderBottom: i < MOCK_PURCHASED_BEATS.length - 1 ? "1px solid #141414" : "none",
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                {/* Cover */}
                <div
                  className="shrink-0 rounded-lg"
                  style={{
                    width: 40,
                    height: 40,
                    background: genreColor(beat.genre),
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  }}
                />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: "#f5f5f7" }}>
                    {beat.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#86868b" }}>
                    {beat.producer?.display_name ?? "Ukjent"} &middot; {beat.genre} &middot; {beat.bpm} BPM
                  </p>
                </div>

                {/* Tags */}
                <div className="hidden items-center gap-1.5 lg:flex">
                  {beat.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{ background: "rgba(255,255,255,0.05)", color: "#86868b" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Download */}
                <button
                  className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: "#0071e3", color: "#fff" }}
                  onClick={() => {
                    // TODO: trigger real download from Supabase Storage
                    alert("Last ned: " + beat.title);
                  }}
                >
                  <Download size={13} />
                  Last ned
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Kjøpte samples & presets ── */}
      <section>
        <h2
          className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight"
          style={{ color: "#f5f5f7" }}
        >
          <Package size={16} style={{ color: "#86868b" }} />
          Kjøpt Samples & Presets
        </h2>
        <EmptyState label="Ingen kjøpte samples eller presets enda" />
      </section>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl py-14"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e1e" }}
    >
      <p className="text-sm font-medium" style={{ color: "#3a3a3a" }}>
        {label}
      </p>
    </div>
  );
}
