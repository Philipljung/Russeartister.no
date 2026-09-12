"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Play, Pause } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { slugifyName } from "@/lib/slugify";
import type { Pack } from "@/lib/supabase/types";

export default function PackGridCard({ pack }: { pack: Pack }) {
  const router = useRouter();
  const { currentBeat, isPlaying: playerIsPlaying, toggleBeat } = usePlayer();
  const [hovered, setHovered] = useState(false);
  const coverImg = pack.cover_url ?? pack.producer?.avatar_url ?? null;
  const sampleCount = pack.pack_items?.filter((i) => i.item_type === "sample").length ?? 0;
  const presetCount = pack.pack_items?.filter((i) => i.item_type === "preset").length ?? 0;
  const totalCount = pack.pack_items?.length ?? 0;

  const packBeatId = `pack-${pack.id}`;
  const isThisPlaying = currentBeat?.id === packBeatId && playerIsPlaying;

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    if (!pack.preview_url) return;
    toggleBeat({
      id: packBeatId,
      title: pack.title,
      audio_preview_url: pack.preview_url,
      cover_url: pack.cover_url ?? null,
      genre: null,
      bpm: null,
      key: null,
      producer: pack.producer ?? undefined,
    });
  }

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all cursor-pointer"
      style={{ background: hovered ? "rgba(255,255,255,0.04)" : "#141414", border: "1px solid #1e1e1e" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/packs/${pack.id}`)}
    >
      <div className="relative aspect-square" style={{ background: "#0a0a0a" }}>
        {coverImg ? (
          <Image src={coverImg} alt={pack.title} fill className="object-cover" sizes="400px" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-4xl font-bold" style={{ color: "#1e1e1e" }}>{pack.title.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        {pack.preview_url && (
          <button
            onClick={togglePlay}
            className="absolute bottom-3 right-3 flex items-center justify-center rounded-full transition-opacity hover:opacity-90"
            style={{ width: 40, height: 40, background: "#f5f5f7", color: "#080808" }}
          >
            {isThisPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
          </button>
        )}
      </div>
      <div className="px-4 py-3">
        <p className="text-sm font-semibold truncate" style={{ color: "#f5f5f7" }}>{pack.title}</p>
        <Link
          href={`/profile/${slugifyName(pack.producer?.display_name ?? "")}`}
          className="text-xs mt-0.5 block truncate transition-opacity hover:opacity-80"
          style={{ color: "#86868b" }}
          onClick={(e) => e.stopPropagation()}
        >
          {pack.producer?.display_name ?? "Ukjent"}
        </Link>
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-2">
            {sampleCount > 0 && <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}>{sampleCount} samples</span>}
            {presetCount > 0 && <span className="text-xs rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}>{presetCount} presets</span>}
            {totalCount === 0 && <span className="text-xs" style={{ color: "#3a3a3a" }}>Tom pakke</span>}
          </div>
          <span className="text-sm font-semibold" style={{ color: "#f5f5f7" }}>
            {pack.price === 0 ? "Gratis" : `${pack.price} kr`}
          </span>
        </div>
      </div>
    </div>
  );
}
