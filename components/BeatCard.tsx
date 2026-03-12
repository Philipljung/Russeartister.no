"use client";

import { useState } from "react";
import { Play, Pause } from "lucide-react";
import type { Beat } from "@/lib/supabase/types";
import { usePlayer } from "@/lib/player-context";

type Props = {
  beat: Beat;
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

export default function BeatCard({ beat }: Props) {
  const [hovered, setHovered] = useState(false);
  const { currentBeat, isPlaying, toggleBeat } = usePlayer();

  const isActive = currentBeat?.id === beat.id;
  const isCurrentlyPlaying = isActive && isPlaying;
  const coverBg = beat.cover_url ? undefined : genreColor(beat.genre);

  return (
    <div
      className="group flex items-center gap-4 rounded-xl px-4 py-3 transition-colors cursor-pointer"
      style={{
        background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
        borderBottom: "1px solid #1a1a1a",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Play button */}
      <button
        onClick={() => toggleBeat(beat)}
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
      <div
        className="shrink-0 rounded-lg"
        style={{
          width: 40,
          height: 40,
          background: coverBg,
          backgroundImage: beat.cover_url ? `url(${beat.cover_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
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
          {beat.producer?.display_name ?? "Ukjent"} &middot; {beat.genre}
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
          style={{ color: "#f5f5f7", minWidth: 64, textAlign: "right" }}
        >
          kr {beat.price.toLocaleString("nb-NO")}
        </span>
        <button
          className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-all"
          style={{
            background: hovered ? "#f5f5f7" : "rgba(255,255,255,0.08)",
            color: hovered ? "#080808" : "#f5f5f7",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          Kjøp
        </button>
      </div>
    </div>
  );
}
