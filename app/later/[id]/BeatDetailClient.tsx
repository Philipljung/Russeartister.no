"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Pause, Share2, ChevronLeft } from "lucide-react";
import type { Beat } from "@/lib/supabase/types";
import { usePlayer } from "@/lib/player-context";
import { useToast } from "@/lib/toast-context";
import BeatCheckoutModal from "@/components/BeatCheckoutModal";
import BeatCard from "@/components/BeatCard";

function genreColor(genre: string): string {
  const palette = ["#1a1040", "#001a2e", "#1a2e00", "#2e1a00", "#001e14", "#14001e", "#1e0a0a", "#00141e"];
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function getFileExt(url: string | null): string | null {
  if (!url) return null;
  const filename = url.split("/").pop()?.split("?")[0] ?? "";
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 6 ? ext : null;
}

export default function BeatDetailClient({
  beat,
  recommended,
  exclusiveAvailable,
}: {
  beat: Beat;
  recommended: Beat[];
  exclusiveAvailable: boolean;
}) {
  const { currentBeat, isPlaying, toggleBeat } = usePlayer();
  const { toast } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [exclusiveMode, setExclusiveMode] = useState(false);

  const isActive = currentBeat?.id === beat.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  const producer = beat.producer;
  const coverImg = beat.cover_url ?? producer?.avatar_url ?? null;
  const coverBg = coverImg ? undefined : genreColor(beat.genre);

  const projectFileExt = getFileExt(beat.project_file_url);
  const hasProjectFile = !!beat.project_file_url;

  function openCheckout(exclusive = false) {
    setExclusiveMode(exclusive);
    setCheckoutOpen(true);
  }

  async function handleShare() {
    await navigator.clipboard.writeText(`${window.location.origin}/later/${beat.id}`);
    toast("Lenke kopiert!");
  }

  async function handleFreeDownload() {
    const res = await fetch(`/api/beats/free-download?beatId=${beat.id}`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
    else toast("Nedlasting feilet. Prøv igjen.");
  }

  const props: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Sjanger", value: beat.genre },
    { label: "BPM", value: String(beat.bpm) },
    ...(beat.key ? [{ label: "Skala", value: beat.key }] : []),
    ...(beat.vocal_type ? [{ label: "Vokal", value: beat.vocal_type === "med_vokal" ? "Med vokal" : "Uten vokal" }] : []),
    {
      label: "Prosjektfil",
      value: hasProjectFile ? `Ja${projectFileExt ? ` (${projectFileExt})` : ""}` : "Nei",
      highlight: hasProjectFile,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6 py-8">

      {/* Back */}
      <Link
        href="/later"
        className="mb-6 inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-60"
        style={{ color: "#86868b" }}
      >
        <ChevronLeft size={14} />
        Låter
      </Link>

      {/* Main card */}
      <div
        className="rounded-2xl p-5 md:p-8 mb-4 relative"
        style={{ background: "linear-gradient(135deg, #1e1e1e, #121212)" }}
      >
        {/* Del — top right */}
        <button
          onClick={handleShare}
          className="absolute top-6 right-6 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-opacity hover:opacity-70"
          style={{ color: "#86868b", background: "rgba(255,255,255,0.06)" }}
        >
          <Share2 size={12} />
          Del
        </button>

        {/* Cover + title row */}
        <div className="flex gap-4 md:gap-5 items-start">
          {/* Cover with play overlay */}
          <div className="relative shrink-0 w-20 h-20 md:w-28 md:h-28">
            <div
              className="rounded-xl w-full h-full"
              style={{
                backgroundImage: coverImg ? `url(${coverImg})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundColor: coverBg ?? "#2a2a2a",
                boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              }}
            />
            <button
              onClick={() => toggleBeat(beat)}
              className="absolute inset-0 flex items-center justify-center rounded-xl transition-all"
              style={{ background: isCurrentlyPlaying ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)" }}
            >
              {isCurrentlyPlaying
                ? <Pause size={20} fill="#f5f5f7" color="#f5f5f7" />
                : <Play size={20} fill="#f5f5f7" color="#f5f5f7" />}
            </button>
          </div>

          {/* Title + producer */}
          <div className="flex-1 min-w-0 pt-1 pr-10 md:pr-16">
            <h1
              className="leading-tight mb-2 text-xl md:text-2xl"
              style={{ color: "#f5f5f7", fontWeight: 800 }}
            >
              {beat.title}
            </h1>
            <Link
              href={`/profile/${producer?.username ?? ""}`}
              className="text-sm hover:underline"
              style={{ color: "#86868b" }}
            >
              {producer?.display_name ?? "Ukjent"}
            </Link>
          </div>
        </div>

        {/* Description */}
        {beat.description && (
          <p className="mt-6 text-sm leading-relaxed" style={{ color: "#86868b" }}>
            {beat.description}
          </p>
        )}

        {/* Props — pill row */}
        <div className="flex flex-wrap gap-2 mt-6">
          {props.map(({ label, value, highlight }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <span className="text-xs" style={{ color: "#86868b" }}>{label}</span>
              <div style={{ width: 1, height: 10, background: "#2a2a2a" }} />
              <span
                className="text-xs font-semibold"
                style={{ color: highlight ? "#34d399" : "#f5f5f7" }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Tags */}
        {beat.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {beat.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-0.5 text-xs"
                style={{ background: "rgba(255,255,255,0.04)", color: "#3a3a3a" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom row: price + buy + exclusive */}
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 pt-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: "#3a3a3a" }}>Pris</span>
            <span className="text-xl font-bold" style={{ color: "#f5f5f7" }}>
              {beat.price === 0 ? "Gratis" : `kr ${beat.price.toLocaleString("nb-NO")}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {exclusiveAvailable && (
              <button
                onClick={() => openCheckout(true)}
                className="rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: "rgba(234,179,8,0.1)",
                  color: "#eab308",
                  border: "1px solid rgba(234,179,8,0.25)",
                }}
              >
                Eksklusiv · kr {beat.exclusive_price!.toLocaleString("nb-NO")}
              </button>
            )}
            <button
              onClick={beat.price === 0 ? handleFreeDownload : () => openCheckout(false)}
              className="rounded-full px-6 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#f5f5f7", color: "#080808" }}
            >
              {beat.price === 0 ? "Last ned" : "Kjøp"}
            </button>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommended.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "#3a3a3a" }}>
            Lignende låter
          </p>
          <div>
            {recommended.map((b) => (
              <BeatCard key={b.id} beat={b} />
            ))}
          </div>
        </div>
      )}

      {checkoutOpen && (
        <BeatCheckoutModal
          beat={beat}
          onClose={() => setCheckoutOpen(false)}
          initialExclusive={exclusiveMode}
        />
      )}
    </div>
  );
}
