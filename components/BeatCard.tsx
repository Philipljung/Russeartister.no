"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Pause } from "lucide-react";
import type { Beat } from "@/lib/supabase/types";
import { usePlayer } from "@/lib/player-context";
import { useToast } from "@/lib/toast-context";
import BeatCheckoutModal from "./BeatCheckoutModal";

type Props = {
  beat: Beat;
  isSelected?: boolean;
  onSelect?: () => void;
};

function genreColor(genre: string): string {
  const palette = [
    "#1a1040", "#001a2e", "#1a2e00", "#2e1a00",
    "#001e14", "#14001e", "#1e0a0a", "#00141e",
  ];
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function BeatCard({ beat, isSelected = false, onSelect }: Props) {
  const [hovered, setHovered] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { currentBeat, isPlaying, toggleBeat } = usePlayer();
  const { toast } = useToast();

  const isActive = currentBeat?.id === beat.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  // Autoplay when selected via keyboard
  useEffect(() => {
    if (isSelected && !isCurrentlyPlaying) {
      toggleBeat(beat);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelected]);
  const coverImg = beat.cover_url ?? beat.producer?.avatar_url ?? null;
  const coverBg = coverImg ? undefined : genreColor(beat.genre);

  function handleBuy(e: React.MouseEvent) {
    e.stopPropagation();
    setCheckoutOpen(true);
  }

  async function handleFreeDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/beats/free-download?beatId=${beat.id}`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
    else toast("Nedlasting feilet. Prøv igjen.");
  }

  return (
    <>
    <div
      className="group flex items-center gap-2 md:gap-4 rounded-xl px-2 md:px-4 py-3 transition-colors cursor-pointer"
      style={{
        background: isSelected ? "rgba(255,255,255,0.06)" : hovered ? "rgba(255,255,255,0.04)" : "transparent",
        borderBottom: "1px solid #1a1a1a",
        outline: isSelected ? "1px solid rgba(255,255,255,0.18)" : "none",
        outlineOffset: -1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setCheckoutOpen(true)}
    >
      {/* Play button */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleBeat(beat); }}
        className="flex shrink-0 items-center justify-center rounded-full transition-all"
        style={{
          width: 36,
          height: 36,
          background: isActive
            ? "#6366f1"
            : hovered
            ? "rgba(255,255,255,0.1)"
            : "rgba(255,255,255,0.06)",
          color: "#f5f5f7",
        }}
      >
        {isCurrentlyPlaying ? (
          <Pause size={14} fill="#f5f5f7" />
        ) : (
          <Play size={14} fill="#f5f5f7" />
        )}
      </button>

      {/* Cover */}
      <Link
        href={`/later/${beat.id}`}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 rounded-lg transition-opacity hover:opacity-80"
        style={{
          width: 40,
          height: 40,
          backgroundColor: coverBg ?? "transparent",
          backgroundImage: coverImg ? `url(${coverImg})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          display: "block",
        }}
      />

      {/* Title + genre */}
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-semibold tracking-wide"
          style={{ color: "#f5f5f7" }}
        >
          {beat.title}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "#86868b" }}>
          <Link
            href={`/profile/${beat.producer?.username ?? ""}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:underline"
            style={{ color: "#86868b" }}
          >
            {beat.producer?.display_name ?? "Ukjent"}
          </Link>
          {" "}&middot; {beat.genre}
        </p>
      </div>

      {/* BPM + Key */}
      <div className="hidden shrink-0 text-right sm:block" style={{ width: 72 }}>
        <p className="text-xs font-medium" style={{ color: "#86868b" }}>
          {beat.bpm} BPM
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#3a3a3a" }}>
          {beat.key}
        </p>
      </div>

      {/* Tags */}
      <div className="hidden items-center gap-1.5 lg:flex" style={{ width: 220 }}>
        {beat.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full px-2.5 py-0.5 text-xs"
            style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Price + buy */}
      <div className="flex shrink-0 items-center gap-2">
        <span
          className="text-sm font-semibold"
          style={{ color: "#f5f5f7", width: 80, textAlign: "right", flexShrink: 0 }}
        >
          {beat.price === 0 ? "Gratis" : `kr ${beat.price.toLocaleString("nb-NO")}`}
        </span>
        <button
          className="rounded-lg py-1.5 text-xs font-semibold transition-all"
          style={{
            background: hovered ? "#f5f5f7" : "rgba(255,255,255,0.08)",
            color: hovered ? "#080808" : "#f5f5f7",
            cursor: "pointer",
            width: 76,
          }}
          onClick={beat.price === 0 ? handleFreeDownload : handleBuy}
        >
          {beat.price === 0 ? "Last ned" : "Kjøp"}
        </button>
      </div>
    </div>

    {checkoutOpen && (
      <BeatCheckoutModal beat={beat} onClose={() => setCheckoutOpen(false)} />
    )}
    </>
  );
}
