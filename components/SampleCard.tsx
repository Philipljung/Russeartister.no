"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Pause, Sliders, Share2 } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/sampleCategories";
import { useToast } from "@/lib/toast-context";
import { slugifyName } from "@/lib/slugify";
import type { Sample } from "@/lib/supabase/types";

function genreColor(cat: string): string {
  const palette = ["#1a1040","#001a2e","#1a2e00","#2e1a00","#001e14","#14001e","#1e0a0a","#00141e"];
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function SampleCard({
  sample,
  isActive,
  isPlaying,
  isSelected = false,
  onToggle,
  onBuy,
}: {
  sample: Sample;
  isActive: boolean;
  isPlaying: boolean;
  isSelected?: boolean;
  onToggle: (sample: Sample) => void;
  onBuy: (sample: Sample) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const coverImg = sample.cover_url ?? sample.producer?.avatar_url ?? null;
  const coverBg = genreColor(sample.category);
  const canPlay = !!sample.audio_preview_url;
  const isPreset = sample.item_type === "preset";

  async function handleFreeDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/free-download?type=sample&id=${sample.id}`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else toast("Nedlasting feilet. Prøv igjen.");
  }

  return (
    <div
      className="flex items-center gap-2 md:gap-4 rounded-xl px-2 md:px-4 py-3 transition-colors cursor-pointer"
      style={{
        background: isSelected ? "rgba(255,255,255,0.06)" : hovered ? "rgba(255,255,255,0.04)" : "transparent",
        borderBottom: "1px solid #1a1a1a",
        outline: isSelected ? "1px solid rgba(255,255,255,0.18)" : "none",
        outlineOffset: -1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/samples/${sample.id}`)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); if (canPlay) onToggle(sample); }}
        className="shrink-0 flex items-center justify-center rounded-full transition-colors"
        style={{
          width: 36, height: 36,
          background: isActive && isPlaying ? "#f5f5f7" : "rgba(255,255,255,0.06)",
          color: isActive && isPlaying ? "#080808" : canPlay ? "#f5f5f7" : "#3a3a3a",
          cursor: canPlay ? "pointer" : "default",
        }}
        title={canPlay ? (isPlaying && isActive ? "Pause" : "Spill av") : "Ingen forhåndsvisning"}
      >
        {isActive && isPlaying
          ? <Pause size={13} fill="#080808" />
          : !canPlay && isPreset
            ? <Sliders size={13} />
            : <Play size={13} fill="currentColor" />}
      </button>

      <Link
        href={`/profile/${slugifyName(sample.producer?.display_name ?? sample.producer?.username ?? "")}`}
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

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-wide" style={{ color: "#f5f5f7" }}>
          {sample.title}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "#86868b" }}>
          <Link href={`/profile/${slugifyName(sample.producer?.display_name ?? sample.producer?.username ?? "")}`} onClick={(e) => e.stopPropagation()} className="hover:underline" style={{ color: "#86868b" }}>
            {sample.producer?.display_name ?? "Ukjent"}
          </Link>
          {!isPreset && sample.bpm ? ` · ${sample.bpm} BPM` : ""}
          {!isPreset && sample.key ? ` · ${sample.key}` : ""}
        </p>
      </div>

      {isPreset && (
        <>
          <div className="hidden sm:block shrink-0" style={{ width: 110 }}>
            <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}>
              {CATEGORY_LABELS[sample.category] ?? sample.category}
            </span>
          </div>
          <div className="hidden sm:block shrink-0" style={{ width: 110 }}>
            {sample.vst && (
              <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}>
                {sample.vst}
              </span>
            )}
          </div>
        </>
      )}

      {!isPreset && (
        <div className="hidden items-center gap-1.5 lg:flex" style={{ width: 200 }}>
          {sample.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full px-2.5 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: "#f5f5f7", width: 80, textAlign: "right", flexShrink: 0 }}>
          {sample.price === 0 ? "Gratis" : `kr ${sample.price.toLocaleString("nb-NO")}`}
        </span>
        <button
          className="rounded-lg py-1.5 text-xs font-semibold transition-all"
          style={{
            background: hovered ? "#f5f5f7" : "rgba(255,255,255,0.08)",
            color: hovered ? "#080808" : "#f5f5f7",
            width: 76,
          }}
          onClick={sample.price === 0 ? handleFreeDownload : (e) => { e.stopPropagation(); onBuy(sample); }}
        >
          {sample.price === 0 ? "Last ned" : "Kjøp"}
        </button>
        <button
          className="flex items-center justify-center rounded-lg transition-all"
          style={{ width: 30, height: 30, background: "rgba(255,255,255,0.06)", color: "#86868b", cursor: "pointer" }}
          title="Kopier lenke"
          onClick={async (e) => {
            e.stopPropagation();
            await navigator.clipboard.writeText(window.location.origin + "/samples/" + sample.id);
            toast("Lenke kopiert!");
          }}
        >
          <Share2 size={12} />
        </button>
      </div>
    </div>
  );
}
