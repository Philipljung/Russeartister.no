"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Pause, Share2, ChevronLeft } from "lucide-react";
import type { Beat } from "@/lib/supabase/types";
import { usePlayer } from "@/lib/player-context";
import { useToast } from "@/lib/toast-context";
import BeatCheckoutModal from "@/components/BeatCheckoutModal";
import BeatCard from "@/components/BeatCard";

function vocalLabel(v: string | null) {
  if (v === "med_vokal") return "Med vokal";
  if (v === "uten_vokal") return "Uten vokal";
  return null;
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

  async function handleShare() {
    const url = `${window.location.origin}/later/${beat.id}`;
    await navigator.clipboard.writeText(url);
    toast("Lenke kopiert!");
  }

  async function handleFreeDownload() {
    const res = await fetch(`/api/beats/free-download?beatId=${beat.id}`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
    else toast("Nedlasting feilet. Prøv igjen.");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 py-8">
      {/* Back */}
      <Link
        href="/later"
        className="mb-6 inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
        style={{ color: "#86868b" }}
      >
        <ChevronLeft size={15} />
        Tilbake til låter
      </Link>

      {/* Hero card */}
      <div
        className="rounded-2xl p-6 md:p-8 mb-6"
        style={{ background: "#141414", border: "1px solid #2a2a2a" }}
      >
        <div className="flex gap-5 md:gap-7 items-start">
          {/* Cover */}
          <div
            className="shrink-0 rounded-xl"
            style={{
              width: 120,
              height: 120,
              backgroundImage: coverImg ? `url(${coverImg})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              background: coverImg ? undefined : "#2a2a2a",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl md:text-2xl font-bold tracking-tight leading-tight mb-1"
              style={{ color: "#f5f5f7" }}
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

            {/* Chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}
              >
                {beat.genre}
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs"
                style={{ background: "rgba(255,255,255,0.05)", color: "#86868b" }}
              >
                {beat.bpm} BPM
              </span>
              {beat.key && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#86868b" }}
                >
                  {beat.key}
                </span>
              )}
              {vocalLabel(beat.vocal_type) && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#86868b" }}
                >
                  {vocalLabel(beat.vocal_type)}
                </span>
              )}
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
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 mt-6">
          {/* Play */}
          <button
            onClick={() => toggleBeat(beat)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
            style={{
              background: isCurrentlyPlaying ? "#6366f1" : "rgba(255,255,255,0.1)",
              color: "#f5f5f7",
            }}
          >
            {isCurrentlyPlaying ? <Pause size={15} fill="#f5f5f7" /> : <Play size={15} fill="#f5f5f7" />}
            {isCurrentlyPlaying ? "Pause" : "Spill av"}
          </button>

          {/* Buy / Download */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: "#f5f5f7" }}>
              {beat.price === 0 ? "Gratis" : `kr ${beat.price.toLocaleString("nb-NO")}`}
            </span>
            <button
              onClick={beat.price === 0 ? handleFreeDownload : () => setCheckoutOpen(true)}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "#f5f5f7", color: "#080808" }}
            >
              {beat.price === 0 ? "Last ned" : "Kjøp"}
            </button>
            {beat.exclusive_price && !beat.exclusively_sold && (
              <button
                onClick={() => setCheckoutOpen(true)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}
              >
                Eksklusiv · kr {beat.exclusive_price.toLocaleString("nb-NO")}
              </button>
            )}
          </div>

          {/* Share */}
          <button
            onClick={handleShare}
            className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm transition-all hover:opacity-70"
            style={{ color: "#86868b", background: "rgba(255,255,255,0.04)", border: "1px solid #2a2a2a" }}
          >
            <Share2 size={14} />
            Del
          </button>
        </div>
      </div>

      {/* Description */}
      {beat.description && (
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: "#141414", border: "1px solid #2a2a2a" }}
        >
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#3a3a3a" }}>
            Beskrivelse
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#86868b" }}>
            {beat.description}
          </p>
        </div>
      )}

      {/* Recommendations */}
      {recommended.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "#86868b" }}>
            Lignende låter
          </h2>
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
