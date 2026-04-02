"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Play, Pause, Share2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchPublicPacks } from "@/lib/fetchPacks";
import type { Pack } from "@/lib/supabase/types";
import { useToast } from "@/lib/toast-context";
import { slugifyName } from "@/lib/slugify";

export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPublicPacks().then((d) => { setPacks(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return packs;
    return packs.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q)) ||
      p.producer?.display_name?.toLowerCase().includes(q)
    );
  }, [packs, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 pt-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>Pakker</h1>
          <p className="text-sm mt-1" style={{ color: "#86868b" }}>Sample packs og preset packs fra produsenter.</p>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-3">
          <Link href="/samples" className="text-sm transition-opacity hover:opacity-80" style={{ color: "#86868b" }}>Samples & Presets</Link>
          <span style={{ color: "#2a2a2a" }}>|</span>
          <span className="text-sm font-medium" style={{ color: "#f5f5f7" }}>Pakker</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6" style={{ maxWidth: 400 }}>
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#3a3a3a" }} />
        <input
          type="text"
          placeholder="Sok i pakker..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none"
          style={{ background: "#141414", border: "1px solid #2a2a2a", color: "#f5f5f7" }}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#86868b" }}>
            <X size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm py-20 text-center" style={{ color: "#3a3a3a" }}>Laster pakker...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm py-20 text-center" style={{ color: "#3a3a3a" }}>
          {search ? "Ingen pakker funnet." : "Ingen pakker publisert enda."}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pack) => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </div>
  );
}

function PackCard({ pack }: { pack: Pack }) {
  const router = useRouter();
  const { toast } = useToast();
  const [hovered, setHovered] = useState(false);
  const coverImg = pack.cover_url ?? pack.producer?.avatar_url ?? null;
  const sampleCount = pack.pack_items?.filter((i) => i.item_type === "sample").length ?? 0;
  const presetCount = pack.pack_items?.filter((i) => i.item_type === "preset").length ?? 0;
  const totalCount = pack.pack_items?.length ?? 0;

  // Find first item with audio for preview
  const previewItem = pack.pack_items?.find((i) => i.audio_url);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    if (!previewItem?.audio_url) return;

    if (audioRef.current) {
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { void audioRef.current.play(); setPlaying(true); }
      return;
    }

    const audio = new Audio(previewItem.audio_url);
    audio.onended = () => setPlaying(false);
    audioRef.current = audio;
    void audio.play();
    setPlaying(true);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all cursor-pointer"
      style={{
        background: hovered ? "rgba(255,255,255,0.04)" : "#141414",
        border: "1px solid #1e1e1e",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/packs/${pack.id}`)}
    >
      {/* Cover */}
      <div className="relative aspect-square" style={{ background: "#0a0a0a" }}>
        {coverImg ? (
          <Image src={coverImg} alt={pack.title} fill className="object-cover" sizes="400px" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-4xl font-bold" style={{ color: "#1e1e1e" }}>{pack.title.slice(0, 2).toUpperCase()}</span>
          </div>
        )}

        {/* Play button overlay */}
        {previewItem && (
          <button
            onClick={togglePlay}
            className="absolute bottom-3 right-3 flex items-center justify-center rounded-full transition-opacity hover:opacity-90"
            style={{ width: 40, height: 40, background: "#f5f5f7", color: "#080808" }}
          >
            {playing ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
          </button>
        )}
      </div>

      {/* Info */}
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
