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

function Prop({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col rounded-xl px-3 py-2.5"
      style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", minWidth: 80 }}
    >
      <span className="text-xs mb-0.5" style={{ color: "#3a3a3a" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: "#f5f5f7" }}>{value}</span>
    </div>
  );
}

export default function BeatDetailClient({
  beat,
  recommended,
}: {
  beat: Beat;
  recommended: Beat[];
}) {
  const { currentBeat, isPlaying, toggleBeat } = usePlayer();
  const { toast } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const isActive = currentBeat?.id === beat.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  const producer = beat.producer;
  const coverImg = beat.cover_url ?? producer?.avatar_url ?? null;
  const coverBg = coverImg ? undefined : genreColor(beat.genre);

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

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-8">

      {/* Top nav */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/later"
          className="inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-70"
          style={{ color: "#86868b" }}
        >
          <ChevronLeft size={15} />
          Låter
        </Link>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-opacity hover:opacity-70"
          style={{ color: "#86868b", background: "#141414", border: "1px solid #2a2a2a" }}
        >
          <Share2 size={13} />
          Del
        </button>
      </div>

      {/* Main card */}
      <div
        className="rounded-2xl p-5 md:p-6 mb-4"
        style={{ background: "#141414", border: "1px solid #2a2a2a" }}
      >
        {/* Top row: cover + info + buy */}
        <div className="flex gap-4 items-start">

          {/* Cover with play overlay */}
          <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
            <div
              className="rounded-xl w-full h-full"
              style={{
                backgroundImage: coverImg ? `url(${coverImg})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundColor: coverBg ?? "#2a2a2a",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              }}
            />
            <button
              onClick={() => toggleBeat(beat)}
              className="absolute inset-0 flex items-center justify-center rounded-xl transition-all"
              style={{ background: isCurrentlyPlaying ? "rgba(99,102,241,0.7)" : "rgba(0,0,0,0.45)" }}
            >
              {isCurrentlyPlaying
                ? <Pause size={22} fill="#f5f5f7" color="#f5f5f7" />
                : <Play size={22} fill="#f5f5f7" color="#f5f5f7" />}
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight leading-tight mb-1" style={{ color: "#f5f5f7" }}>
              {beat.title}
            </h1>
            <Link
              href={`/profile/${producer?.username ?? ""}`}
              className="text-sm hover:underline"
              style={{ color: "#86868b" }}
            >
              {producer?.display_name ?? "Ukjent"}
            </Link>
            <div className="mt-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}
              >
                {beat.genre}
              </span>
            </div>
          </div>

          {/* Price + buy */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-xl font-bold" style={{ color: "#f5f5f7" }}>
              {beat.price === 0 ? "Gratis" : `kr ${beat.price.toLocaleString("nb-NO")}`}
            </span>
            <button
              onClick={beat.price === 0 ? handleFreeDownload : () => setCheckoutOpen(true)}
              className="rounded-xl px-5 py-2 text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "#f5f5f7", color: "#080808" }}
            >
              {beat.price === 0 ? "Last ned" : "Kjøp"}
            </button>
            {beat.exclusive_price && !beat.exclusively_sold && (
              <button
                onClick={() => setCheckoutOpen(true)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}
              >
                Eksklusiv · kr {beat.exclusive_price.toLocaleString("nb-NO")}
              </button>
            )}
          </div>
        </div>

        {/* Props row */}
        <div className="flex flex-wrap gap-2 mt-5">
          <Prop label="BPM" value={String(beat.bpm)} />
          {beat.key && <Prop label="Skala" value={beat.key} />}
          {beat.vocal_type && (
            <Prop label="Vokal" value={beat.vocal_type === "med_vokal" ? "Med vokal" : "Uten vokal"} />
          )}
        </div>

        {/* Description */}
        {beat.description && (
          <p className="mt-4 text-sm leading-relaxed" style={{ color: "#86868b" }}>
            {beat.description}
          </p>
        )}

        {/* Tags */}
        {beat.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {beat.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-0.5 text-xs"
                style={{ background: "rgba(255,255,255,0.05)", color: "#86868b" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommended.length > 0 && (
        <div className="mt-6">
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
        <BeatCheckoutModal beat={beat} onClose={() => setCheckoutOpen(false)} />
      )}
    </div>
  );
}
