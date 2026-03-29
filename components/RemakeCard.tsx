"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Pause, Share2 } from "lucide-react";
import type { Remake } from "@/lib/supabase/types";
import { useToast } from "@/lib/toast-context";

function genreColor(seed: string): string {
  const palette = ["#1a1040","#001a2e","#1a2e00","#2e1a00","#001e14","#14001e","#1e0a0a","#00141e"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

type Props = {
  remake: Remake;
  isActive: boolean;
  isPlaying: boolean;
  isSelected?: boolean;
  onToggle: (remake: Remake) => void;
  onBuy: (remake: Remake) => void;
};

export default function RemakeCard({ remake, isActive, isPlaying, isSelected = false, onToggle, onBuy }: Props) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const coverImg = remake.cover_url ?? remake.producer?.avatar_url ?? null;

  async function handleFreeDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/free-download?type=remake&id=${remake.id}`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else toast("Nedlasting feilet. Prøv igjen.");
  }
  const coverBg = genreColor(remake.title);
  const canPlay = !!remake.audio_preview_url;

  return (
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
      onClick={() => router.push(`/remakes/${remake.id}`)}
    >
      {/* Play button */}
      <button
        onClick={(e) => { e.stopPropagation(); if (canPlay) onToggle(remake); }}
        className="flex shrink-0 items-center justify-center rounded-full transition-all"
        style={{
          width: 36, height: 36,
          background: hovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
          color: canPlay ? "#f5f5f7" : "#3a3a3a",
          cursor: canPlay ? "pointer" : "default",
        }}
        title={canPlay ? (isPlaying && isActive ? "Pause" : "Spill av") : "Ingen forhåndsvisning"}
      >
        {isActive && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>

      {/* Cover */}
      <Link
        href={`/profile/${encodeURIComponent(remake.producer?.display_name ?? remake.producer?.username ?? "")}`}
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

      {/* Title + artist + VSTs */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-wide" style={{ color: "#f5f5f7" }}>
          {remake.title}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "#86868b" }}>
          <Link
            href={`/profile/${encodeURIComponent(remake.producer?.display_name ?? remake.producer?.username ?? "")}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:underline"
            style={{ color: "#86868b" }}
          >
            {remake.producer?.display_name ?? "Ukjent"}
          </Link>
          {remake.vsts && remake.vsts.length > 0 && (
            <> &middot; {remake.vsts.slice(0, 3).join(", ")}</>
          )}
        </p>
      </div>

      {/* DAW badge */}
      <div className="hidden shrink-0 sm:block" style={{ width: 120, overflow: "hidden" }}>
        {remake.daw && (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap"
            style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}
          >
            {remake.daw}
          </span>
        )}
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

      {/* Price + buy + share */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: "#f5f5f7", minWidth: 64, textAlign: "right" }}>
          {remake.price === 0 ? "Gratis" : `kr ${remake.price.toLocaleString("nb-NO")}`}
        </span>
        <button
          className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-all"
          style={{
            background: hovered ? "#f5f5f7" : "rgba(255,255,255,0.08)",
            color: hovered ? "#080808" : "#f5f5f7",
            cursor: "pointer",
          }}
          onClick={remake.price === 0 ? handleFreeDownload : (e) => { e.stopPropagation(); onBuy(remake); }}
        >
          {remake.price === 0 ? "Last ned" : "Kjøp"}
        </button>
        <button
          className="flex items-center justify-center rounded-lg transition-all"
          style={{
            width: 30, height: 30,
            background: "rgba(255,255,255,0.06)",
            color: "#86868b",
            cursor: "pointer",
          }}
          title="Kopier lenke"
          onClick={async (e) => {
            e.stopPropagation();
            await navigator.clipboard.writeText(window.location.origin + "/remakes/" + remake.id);
            toast("Lenke kopiert!");
          }}
        >
          <Share2 size={12} />
        </button>
      </div>
    </div>
  );
}
