"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, X, Package, Sliders, Play, Pause, FolderArchive, ChevronDown, ChevronUp, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchPublicSamples } from "@/lib/fetchSamples";
import { SAMPLE_CATEGORIES, PRESET_CATEGORIES, CATEGORY_LABELS } from "@/lib/sampleCategories";
import type { Sample } from "@/lib/supabase/types";
import SampleCheckoutModal from "@/components/SampleCheckoutModal";
import { useToast } from "@/lib/toast-context";

type ActiveType = "sample" | "preset" | "sample-pack" | "preset-pack";

function genreColor(cat: string): string {
  const palette = ["#1a1040","#001a2e","#1a2e00","#2e1a00","#001e14","#14001e","#1e0a0a","#00141e"];
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

// ── SampleCard ──────────────────────────────────────────────────────────────
function SampleCard({
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
      {/* Play/pause button */}
      <button
        onClick={(e) => { e.stopPropagation(); if (canPlay) onToggle(sample); }}
        className="shrink-0 flex items-center justify-center rounded-full transition-colors"
        style={{
          width: 36, height: 36,
          background: isActive ? "#6366f1" : "rgba(255,255,255,0.06)",
          color: isActive ? "#fff" : canPlay ? "#f5f5f7" : "#3a3a3a",
          cursor: canPlay ? "pointer" : "default",
        }}
        title={canPlay ? (isPlaying && isActive ? "Pause" : "Spill av") : "Ingen forhåndsvisning"}
      >
        {isActive && isPlaying
          ? <Pause size={13} fill="currentColor" />
          : !canPlay && isPreset
            ? <Sliders size={13} />
            : <Play size={13} fill="currentColor" />}
      </button>

      {/* Cover */}
      <Link
        href={`/profile/${sample.producer?.username ?? ""}`}
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
          {sample.title}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "#86868b" }}>
          <Link href={`/profile/${sample.producer?.username ?? ""}`} onClick={(e) => e.stopPropagation()} className="hover:underline" style={{ color: "#86868b" }}>
            {sample.producer?.display_name ?? "Ukjent"}
          </Link>
          {!isPreset && sample.bpm ? ` · ${sample.bpm} BPM` : ""}
          {!isPreset && sample.key ? ` · ${sample.key}` : ""}
        </p>
      </div>

      {/* Preset: Kategori + VST columns */}
      {isPreset && (
        <>
          <div className="hidden sm:block shrink-0" style={{ width: 110 }}>
            <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}>
              {CATEGORY_LABELS[sample.category] ?? sample.category}
            </span>
          </div>
          <div className="hidden sm:block shrink-0" style={{ width: 110 }}>
            {sample.vst && (
              <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(99,102,241,0.08)", color: "#818cf8" }}>
                {sample.vst}
              </span>
            )}
          </div>
        </>
      )}

      {/* Sample: Tags column */}
      {!isPreset && (
        <div className="hidden items-center gap-1.5 lg:flex" style={{ width: 200 }}>
          {sample.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full px-2.5 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Price + buy + share */}
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
          onClick={(e) => { e.stopPropagation(); onBuy(sample); }}
        >
          {sample.price === 0 ? "Last ned" : "Kjøp"}
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

// ── PackCard ─────────────────────────────────────────────────────────────────
function PackCard({
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
  const coverImg = sample.cover_url ?? sample.producer?.avatar_url ?? null;
  const coverBg = genreColor(sample.category);
  const canPlay = !!sample.audio_preview_url;
  const isPresetPack = sample.item_type === "preset-pack";

  return (
    <div
      className="rounded-xl transition-colors"
      style={{ borderBottom: "1px solid #1a1a1a" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center gap-2 md:gap-4 px-2 md:px-4 py-3"
        style={{ background: hovered ? "rgba(255,255,255,0.03)" : "transparent" }}
      >
        {/* Play button */}
        <button
          onClick={() => canPlay && onToggle(sample)}
          className="shrink-0 flex items-center justify-center rounded-full transition-colors"
          style={{
            width: 36, height: 36,
            background: isActive ? "#6366f1" : "rgba(255,255,255,0.06)",
            color: isActive ? "#fff" : canPlay ? "#f5f5f7" : "#3a3a3a",
            cursor: canPlay ? "pointer" : "default",
          }}
        >
          {isActive && isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
        </button>

        {/* Cover */}
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

        {/* Title + meta */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-wide" style={{ color: "#f5f5f7" }}>{sample.title}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: "#86868b" }}>
            <Link href={`/profile/${sample.producer?.username ?? ""}`} className="hover:underline" style={{ color: "#86868b" }}>
              {sample.producer?.display_name ?? "Ukjent"}
            </Link>
            {sample.pack_files ? ` · ${sample.pack_files.length} filer` : ""}
          </p>
        </div>

        {/* Type column */}
        <div className="hidden sm:block shrink-0" style={{ width: 120 }}>
          <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}>
            {isPresetPack ? "Preset Pack" : "Sample Pack"}
          </span>
        </div>

        {/* VST column (preset-packs only) */}
        {isPresetPack && (
          <div className="hidden sm:block shrink-0" style={{ width: 110 }}>
            {sample.vst && (
              <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(99,102,241,0.08)", color: "#818cf8" }}>
                {sample.vst}
              </span>
            )}
          </div>
        )}

        {/* Expand files */}
        {sample.pack_files && sample.pack_files.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", color: "#86868b", border: "1px solid #2a2a2a" }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Detaljer
          </button>
        )}

        {/* Price + buy */}
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
            onClick={() => onBuy(sample)}
          >
            {sample.price === 0 ? "Last ned" : "Kjøp"}
          </button>
        </div>
      </div>

      {/* File list */}
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

// ── Main page ───────────────────────────────────────────────────────────────
export default function SamplesPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeType, setActiveType] = useState<ActiveType>("sample");
  const [activeCategory, setActiveCategory] = useState("");
  const [genre, setGenre] = useState("");
  const [activeVst, setActiveVst] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkoutSample, setCheckoutSample] = useState<Sample | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const toggleSample = useCallback((sample: Sample) => {
    if (!sample.audio_preview_url) return;
    if (playingId === sample.id) {
      if (audioRef.current) {
        if (audioPlaying) { audioRef.current.pause(); setAudioPlaying(false); }
        else { void audioRef.current.play(); setAudioPlaying(true); }
      }
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(sample.audio_preview_url);
    audio.onended = () => { setPlayingId(null); setAudioPlaying(false); };
    audioRef.current = audio;
    setPlayingId(sample.id);
    void audio.play();
    setAudioPlaying(true);
  }, [playingId, audioPlaying]);

  useEffect(() => { return () => { audioRef.current?.pause(); }; }, []);

  useEffect(() => {
    fetchPublicSamples().then((data) => { setSamples(data); setLoading(false); });
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  const genres = useMemo(() => {
    const all = samples.filter((s) => s.genre).map((s) => s.genre);
    return Array.from(new Set(all)).sort();
  }, [samples]);

  const vsts = useMemo(() => {
    const all = samples.filter((s) => (s.item_type === "preset" || s.item_type === "preset-pack") && s.vst).map((s) => s.vst as string);
    return Array.from(new Set(all)).sort();
  }, [samples]);

  const filtered = useMemo(() => {
    let result = [...samples];
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.genre ?? "").toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.producer?.display_name?.toLowerCase().includes(q)
      );
    }
    result = result.filter((s) => s.item_type === activeType);
    if (activeCategory) result = result.filter((s) => s.category === activeCategory);
    if (genre) result = result.filter((s) => s.genre === genre);
    if (activeVst) result = result.filter((s) => s.vst === activeVst);
    return result;
  }, [samples, debouncedQuery, activeType, activeCategory, genre, activeVst]);

  const hasFilters = !!activeCategory || !!genre || !!activeVst;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!["ArrowUp", "ArrowDown"].includes(e.key)) return;
    if (filtered.length === 0) return;
    e.preventDefault();
    setSelectedId((prev) => {
      const idx = filtered.findIndex((s) => s.id === prev);
      if (e.key === "ArrowDown") {
        const next = filtered[Math.min(idx + 1, filtered.length - 1)];
        toggleSample(next);
        return next.id;
      }
      const next = filtered[Math.max(idx - 1, 0)];
      toggleSample(next);
      return next.id;
    });
  }, [filtered, toggleSample]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const TAB_OPTIONS: { value: ActiveType; label: string }[] = [
    { value: "sample",       label: "Samples" },
    { value: "preset",       label: "Presets" },
    { value: "sample-pack",  label: "Sample Pack" },
    { value: "preset-pack",  label: "Preset Pack" },
  ];

  const isPack = activeType === "sample-pack" || activeType === "preset-pack";
  const isPreset = activeType === "preset";

  return (
    <>
      {/* Sticky filter bar */}
      <div
        className="sticky top-14 z-40 border-b"
        style={{ background: "rgba(8,8,8,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: "#1e1e1e" }}
      >
        <div className="mx-auto max-w-7xl space-y-3 px-4 md:px-6 py-4">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#86868b" }} />
            <input
              type="text"
              placeholder="Søk etter samples, kategori, tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                background: "#141414", border: "1px solid #2a2a2a", borderRadius: 12,
                padding: "9px 12px 9px 36px", paddingRight: query ? 36 : 12,
                fontSize: 13, color: "#f5f5f7", outline: "none", width: "100%",
              }}
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "#86868b" }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b" style={{ borderColor: "#1e1e1e", marginBottom: -1 }}>
            {TAB_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setActiveType(value); setActiveCategory(""); setActiveVst(""); }}
                className="px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  color: activeType === value ? "#f5f5f7" : "#86868b",
                  borderBottom: activeType === value ? "2px solid #818cf8" : "2px solid transparent",
                  background: "transparent",
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Category chips + filters */}
          <div className="flex items-center gap-2 pt-3 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {activeType === "sample" &&
              Object.entries(SAMPLE_CATEGORIES).map(([, cats]) =>
                cats.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? "" : cat)}
                    className="shrink-0 rounded-xl px-3 py-1.5 text-xs transition-all whitespace-nowrap"
                    style={{
                      background: activeCategory === cat ? "rgba(99,102,241,0.12)" : "transparent",
                      border: `1px solid ${activeCategory === cat ? "rgba(99,102,241,0.35)" : "#2a2a2a"}`,
                      color: activeCategory === cat ? "#818cf8" : "#3a3a3a",
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))
              )}

            {activeType === "preset" &&
              Object.values(PRESET_CATEGORIES)[0].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? "" : cat)}
                  className="rounded-xl px-3 py-1.5 text-xs transition-all"
                  style={{
                    background: activeCategory === cat ? "rgba(99,102,241,0.12)" : "transparent",
                    border: `1px solid ${activeCategory === cat ? "rgba(99,102,241,0.35)" : "#2a2a2a"}`,
                    color: activeCategory === cat ? "#818cf8" : "#3a3a3a",
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}

            <div className="shrink-0 ml-auto flex items-center gap-2">
              {genres.length > 0 && !isPack && (
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  style={{
                    background: "#141414", color: genre ? "#f5f5f7" : "#86868b",
                    border: `1px solid ${genre ? "rgba(99,102,241,0.35)" : "#2a2a2a"}`,
                    borderRadius: 12, padding: "7px 12px", fontSize: 13, outline: "none", cursor: "pointer",
                  }}
                >
                  <option value="">Alle sjangre</option>
                  {genres.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
              {(isPreset || activeType === "preset-pack") && vsts.length > 0 && (
                <select
                  value={activeVst}
                  onChange={(e) => setActiveVst(e.target.value)}
                  style={{
                    background: "#141414", color: activeVst ? "#f5f5f7" : "#86868b",
                    border: `1px solid ${activeVst ? "rgba(99,102,241,0.35)" : "#2a2a2a"}`,
                    borderRadius: 12, padding: "7px 12px", fontSize: 13, outline: "none", cursor: "pointer",
                  }}
                >
                  <option value="">Alle VST</option>
                  {vsts.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              )}
              {hasFilters && (
                <button
                  onClick={() => { setActiveCategory(""); setGenre(""); setActiveVst(""); }}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs whitespace-nowrap"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #2a2a2a", color: "#86868b" }}
                >
                  <X size={12} /> Nullstill
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {checkoutSample && (
        <SampleCheckoutModal sample={checkoutSample} onClose={() => setCheckoutSample(null)} />
      )}

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#f5f5f7" }}>
            {TAB_OPTIONS.find((t) => t.value === activeType)?.label}
          </h1>
          {!loading && (
            <p className="text-sm" style={{ color: "#86868b" }}>
              {filtered.length} {filtered.length === 1 ? "resultat" : "resultater"}
            </p>
          )}
        </div>

        {loading ? (
          <div className="mt-20 text-center" style={{ color: "#3a3a3a" }}>
            <p className="text-sm">Laster...</p>
          </div>
        ) : samples.length === 0 ? (
          <div className="mt-20 text-center">
            <Package size={40} className="mx-auto mb-4" style={{ color: "#2a2a2a" }} />
            <p className="text-lg font-medium" style={{ color: "#3a3a3a" }}>Ingen innhold ennå</p>
            <p className="mt-1 text-sm" style={{ color: "#2a2a2a" }}>Kom tilbake snart</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-20 text-center" style={{ color: "#3a3a3a" }}>
            <p className="text-lg font-medium">Ingen resultater</p>
            <p className="mt-1 text-sm">Prøv å justere filtrene</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="mb-2 flex items-center gap-4 px-4 text-xs font-medium uppercase tracking-wider" style={{ color: "#3a3a3a" }}>
              <div style={{ width: 36 }} />
              <div style={{ width: 40 }} />
              <div className="flex-1">Tittel</div>
              {isPreset && <div className="hidden sm:block" style={{ width: 110 }}>Kategori</div>}
              {isPreset && <div className="hidden sm:block" style={{ width: 110 }}>VST</div>}
              {isPack && <div className="hidden sm:block" style={{ width: 120 }}>Type</div>}
              {activeType === "preset-pack" && <div className="hidden sm:block" style={{ width: 110 }}>VST</div>}
              {isPack && <div className="hidden sm:block" style={{ width: 88 }} />}
              {!isPreset && !isPack && <div className="hidden lg:block" style={{ width: 200 }}>Tags</div>}
              <div style={{ width: 80, textAlign: "right" }}>Pris</div>
              <div style={{ width: 76 }} />
            </div>
            <div>
              {filtered.map((s) =>
                s.item_type === "sample-pack" || s.item_type === "preset-pack" ? (
                  <PackCard key={s.id} sample={s} isActive={playingId === s.id} isPlaying={audioPlaying} onToggle={toggleSample} onBuy={setCheckoutSample} />
                ) : (
                  <SampleCard key={s.id} sample={s} isActive={playingId === s.id} isPlaying={audioPlaying} isSelected={selectedId === s.id} onToggle={toggleSample} onBuy={setCheckoutSample} />
                )
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
