"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Pause } from "lucide-react";
import type { Remake } from "@/lib/supabase/types";

function genreColor(genre: string): string {
  const palette = ["#1a1040","#001a2e","#1a2e00","#2e1a00","#001e14","#14001e","#1e0a0a","#00141e"];
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

type Props = {
  remake: Remake;
  isActive: boolean;
  isPlaying: boolean;
  onToggle: (remake: Remake) => void;
  onBuy: (remake: Remake) => void;
};

export default function RemakeCard({ remake, isActive, isPlaying, onToggle, onBuy }: Props) {
  const [hovered, setHovered] = useState(false);
  const coverImg = remake.cover_url ?? remake.producer?.avatar_url ?? null;
  const coverBg = genreColor(remake.genre);
  const canPlay = !!remake.audio_preview_url;

  return (
    <div
      className="group flex items-center gap-2 md:gap-4 rounded-xl px-2 md:px-4 py-3 transition-colors cursor-pointer"
      style={{
        background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
        borderBottom: "1px solid #1a1a1a",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onBuy(remake)}
    >
      {/* Play button */}
      <button
        onClick={(e) => { e.stopPropagation(); if (canPlay) onToggle(remake); }}
        className="flex shrink-0 items-center justify-center rounded-full transition-all"
        style={{
          width: 36, height: 36,
          background: isActive ? "#6366f1" : hovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
          color: isActive ? "#fff" : canPlay ? "#f5f5f7" : "#3a3a3a",
          cursor: canPlay ? "pointer" : "default",
        }}
        title={canPlay ? (isPlaying && isActive ? "Pause" : "Spill av") : "Ingen forhåndsvisning"}
      >
        {isActive && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>

      {/* Cover */}
      <Link
        href={`/profile/${remake.producer?.username ?? ""}`}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 rounded-lg transition-opacity hover:opacity-80"
        style={{
          width: 40, height: 40,
          backgroundColor: coverBg,
          backgroundImage: coverImg ? `url(${coverImg})` : "none",
          backgroundSize: "cover", backgroundPosition: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          display: "block",
        }}
      />

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-wide" style={{ color: "#f5f5f7" }}>
          {remake.title}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "#86868b" }}>
          <Link
            href={`/profile/${remake.producer?.username ?? ""}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:underline"
            style={{ color: "#86868b" }}
          >
            {remake.producer?.display_name ?? "Ukjent"}
          </Link>
          {" "}&middot;{" "}
          <span style={{ color: "#4a4a4a" }}>remake av</span>
          {" "}{remake.original_song}
        </p>
      </div>

      {/* BPM + Key */}
      <div className="hidden shrink-0 text-right sm:block" style={{ width: 72 }}>
        <p className="text-xs font-medium" style={{ color: "#86868b" }}>{remake.bpm} BPM</p>
        <p className="text-xs mt-0.5" style={{ color: "#3a3a3a" }}>{remake.key}</p>
      </div>

      {/* Tags */}
      <div className="hidden items-center gap-1.5 lg:flex" style={{ width: 200 }}>
        {remake.tags.slice(0, 3).map((tag) => (
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
        <span className="text-sm font-semibold" style={{ color: "#f5f5f7", minWidth: 64, textAlign: "right" }}>
          kr {remake.price.toLocaleString("nb-NO")}
        </span>
        <button
          className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-all"
          style={{
            background: hovered ? "#f5f5f7" : "rgba(255,255,255,0.08)",
            color: hovered ? "#080808" : "#f5f5f7",
            cursor: "pointer",
          }}
          onClick={(e) => { e.stopPropagation(); onBuy(remake); }}
        >
          Kjøp
        </button>
      </div>
    </div>
  );
}
