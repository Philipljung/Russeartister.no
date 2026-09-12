"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Pause, FolderArchive, ChevronDown, ChevronUp, Share2 } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { slugifyName } from "@/lib/slugify";
import type { Sample } from "@/lib/supabase/types";

function genreColor(cat: string): string {
  const palette = ["#1a1040","#001a2e","#1a2e00","#2e1a00","#001e14","#14001e","#1e0a0a","#00141e"];
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function SamplePackCard({
  sample,
  isActive,
  isPlaying,
  onToggle,
  onBuy,
}: {
  sample: Sample;
  isActive: boolean;
  isPlaying: boolean;
  onToggle: (sample: Sample) => void;
  onBuy: (sample: Sample) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const coverImg = sample.cover_url ?? sample.producer?.avatar_url ?? null;
  const coverBg = genreColor(sample.category);
  const canPlay = !!sample.audio_preview_url;
  const isPresetPack = sample.item_type === "preset-pack";

  async function handleFreeDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/free-download?type=sample&id=${sample.id}`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else toast("Nedlasting feilet. Prøv igjen.");
  }

  return (
    <div
      className="rounded-xl transition-colors"
      style={{ borderBottom: "1px solid #1a1a1a" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center gap-2 md:gap-4 px-2 md:px-4 py-3 cursor-pointer"
        style={{ background: hovered ? "rgba(255,255,255,0.03)" : "transparent" }}
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
        >
          {isActive && isPlaying ? <Pause size={13} fill="#080808" /> : <Play size={13} fill="currentColor" />}
        </button>

        <div
          className="shrink-0 rounded-lg flex items-center justify-center"
          style={{
            width: 40, height: 40,
            backgroundColor: coverImg ? "transparent" : coverBg,
            backgroundImage: coverImg ? `url(${coverImg})` : "none",
            backgroundSize: "cover", backgroundPosition: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          {!coverImg && <FolderArchive size={16} style={{ color: "rgba(255,255,255,0.3)" }} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-wide" style={{ color: "#f5f5f7" }}>{sample.title}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: "#86868b" }}>
            <Link href={`/profile/${slugifyName(sample.producer?.display_name ?? sample.producer?.username ?? "")}`} className="hover:underline" style={{ color: "#86868b" }}>
              {sample.producer?.display_name ?? "Ukjent"}
            </Link>
            {sample.pack_files ? ` · ${sample.pack_files.length} filer` : ""}
          </p>
        </div>

        <div className="hidden sm:block shrink-0" style={{ width: 120 }}>
          <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}>
            {isPresetPack ? "Preset Pack" : "Sample Pack"}
          </span>
        </div>

        {isPresetPack && (
          <div className="hidden sm:block shrink-0" style={{ width: 110 }}>
            {sample.vst && (
              <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}>
                {sample.vst}
              </span>
            )}
          </div>
        )}

        {sample.pack_files && sample.pack_files.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", color: "#86868b", border: "1px solid #2a2a2a" }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Detaljer
          </button>
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

      {expanded && sample.pack_files && (
        <div className="mx-4 mb-3 rounded-xl px-4 py-3" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
          <p className="text-xs font-medium mb-2" style={{ color: "#86868b" }}>{sample.pack_files.length} filer inkludert</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {sample.pack_files.map((name, i) => (
              <p key={i} className="text-xs font-mono truncate" style={{ color: "#4a4a4a" }}>{name}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
