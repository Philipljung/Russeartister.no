"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { Search, X, Package } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { fetchPublicSamples } from "@/lib/fetchSamples";
import { fetchPublicPacks } from "@/lib/fetchPacks";
import { getSupabaseClient } from "@/lib/supabase/client";
import { SAMPLE_CATEGORIES, PRESET_CATEGORIES, CATEGORY_LABELS } from "@/lib/sampleCategories";
import type { Sample, Pack } from "@/lib/supabase/types";
import dynamic from "next/dynamic";
const SampleCheckoutModal = dynamic(() => import("@/components/SampleCheckoutModal"), { ssr: false });
import { usePlayer } from "@/lib/player-context";
import SampleCard from "@/components/SampleCard";
import SamplePackCard from "@/components/SamplePackCard";
import PackGridCard from "@/components/PackGridCard";
import { SkeletonRows } from "@/components/SkeletonRow";

type ActiveType = "sample" | "preset" | "pack";

export default function SamplesPageWrapper() {
  return (
    <Suspense>
      <SamplesPage />
    </Suspense>
  );
}

function SamplesPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeType, setActiveType] = useState<ActiveType>(
    initialTab === "sample" ? "sample" : initialTab === "preset" ? "preset" : "pack"
  );
  const [activeCategory, setActiveCategory] = useState("");
  const [genre, setGenre] = useState("");
  const [activeVst, setActiveVst] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkoutSample, setCheckoutSample] = useState<Sample | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [vsts, setVsts] = useState<string[]>([]);
  const offsetRef = useRef(0);
  const { currentBeat, isPlaying, toggleBeat } = usePlayer();

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.from("samples").select("genre, vst, item_type").eq("is_published", true).is("deleted_at", null).then(({ data }: { data: { genre: string; vst: string; item_type: string }[] | null }) => {
      if (!data) return;
      setGenres(Array.from(new Set(data.map((s) => s.genre).filter(Boolean))).sort() as string[]);
      setVsts(Array.from(new Set(
        data.filter((s) => s.item_type === "preset" || s.item_type === "preset-pack")
          .map((s) => s.vst).filter(Boolean)
      )).sort() as string[]);
    });
  }, []);

  const toggleSample = useCallback((sample: Sample) => {
    if (!sample.audio_preview_url) return;
    toggleBeat(sample);
  }, [toggleBeat]);

  const loadItems = useCallback(async (
    type: ActiveType, q: string, cat: string, g: string, vst: string, reset: boolean
  ) => {
    const PAGE_SIZE = 20;
    const from = reset ? 0 : offsetRef.current;
    const to = from + PAGE_SIZE - 1;

    if (reset) setLoading(true); else setLoadingMore(true);

    if (type === "pack") {
      const data = await fetchPublicPacks({ query: q, from, to });
      if (reset) setPacks(data); else setPacks((prev) => [...prev, ...data]);
      if (reset) offsetRef.current = data.length; else offsetRef.current += data.length;
      setHasMore(data.length === PAGE_SIZE);
    } else {
      const data = await fetchPublicSamples({ query: q, itemType: type, category: cat, genre: g, vst, from, to });
      if (reset) setSamples(data); else setSamples((prev) => [...prev, ...data]);
      if (reset) offsetRef.current = data.length; else offsetRef.current += data.length;
      setHasMore(data.length === PAGE_SIZE);
    }

    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    offsetRef.current = 0;
    void loadItems(activeType, debouncedQuery, activeCategory, genre, activeVst, true);
  }, [activeType, debouncedQuery, activeCategory, genre, activeVst, loadItems]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!["ArrowUp", "ArrowDown"].includes(e.key) || samples.length === 0) return;
    e.preventDefault();
    setSelectedId((prev) => {
      const idx = samples.findIndex((s) => s.id === prev);
      if (e.key === "ArrowDown") { const n = samples[Math.min(idx + 1, samples.length - 1)]; toggleSample(n); return n.id; }
      const n = samples[Math.max(idx - 1, 0)]; toggleSample(n); return n.id;
    });
  }, [samples, toggleSample]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const TAB_OPTIONS: { value: ActiveType; label: string }[] = [
    { value: "pack",   label: "Pakker" },
    { value: "sample", label: "Samples" },
    { value: "preset", label: "Presets" },
  ];

  const isPack = activeType === "pack";
  const isPreset = activeType === "preset";
  const hasFilters = !!activeCategory || !!genre || !!activeVst;

  return (
    <>
      {/* Sticky filter bar */}
      <div
        className="sticky top-14 z-40 border-b"
        style={{ background: "rgba(8,8,8,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: "#1e1e1e" }}
      >
        <div className="mx-auto max-w-7xl space-y-3 px-4 md:px-6 py-4">
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

          <div className="flex items-center gap-1 border-b" style={{ borderColor: "#1e1e1e", marginBottom: -1 }}>
            {TAB_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setActiveType(value); setActiveCategory(""); setActiveVst(""); }}
                className="px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  color: activeType === value ? "#f5f5f7" : "#86868b",
                  borderBottom: activeType === value ? "2px solid #f5f5f7" : "2px solid transparent",
                  background: "transparent", marginBottom: -1,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {!isPack && (
            <div className="flex items-center gap-2 pt-3">
              {genres.length > 0 && (
                <select value={genre} onChange={(e) => setGenre(e.target.value)}
                  style={{ background: "#141414", color: genre ? "#f5f5f7" : "#86868b", border: `1px solid ${genre ? "rgba(255,255,255,0.2)" : "#2a2a2a"}`, borderRadius: 12, padding: "7px 12px", fontSize: 13, outline: "none", cursor: "pointer" }}>
                  <option value="">Alle sjangre</option>
                  {genres.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
              {isPreset && vsts.length > 0 && (
                <select value={activeVst} onChange={(e) => setActiveVst(e.target.value)}
                  style={{ background: "#141414", color: activeVst ? "#f5f5f7" : "#86868b", border: `1px solid ${activeVst ? "rgba(255,255,255,0.2)" : "#2a2a2a"}`, borderRadius: 12, padding: "7px 12px", fontSize: 13, outline: "none", cursor: "pointer" }}>
                  <option value="">Alle VST</option>
                  {vsts.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              )}
              {hasFilters && (
                <button onClick={() => { setActiveCategory(""); setGenre(""); setActiveVst(""); }}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs whitespace-nowrap"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #2a2a2a", color: "#86868b" }}>
                  <X size={12} /> Nullstill
                </button>
              )}
            </div>
          )}

          {!isPack && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {activeType === "sample" && Object.entries(SAMPLE_CATEGORIES).map(([, cats]) =>
                cats.map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? "" : cat)}
                    className="shrink-0 rounded-xl px-3 py-1.5 text-xs transition-all whitespace-nowrap"
                    style={{ background: activeCategory === cat ? "rgba(255,255,255,0.1)" : "transparent", border: `1px solid ${activeCategory === cat ? "rgba(255,255,255,0.2)" : "#2a2a2a"}`, color: activeCategory === cat ? "#f5f5f7" : "#3a3a3a" }}>
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))
              )}
              {activeType === "preset" && Object.values(PRESET_CATEGORIES)[0].map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? "" : cat)}
                  className="rounded-xl px-3 py-1.5 text-xs transition-all"
                  style={{ background: activeCategory === cat ? "rgba(255,255,255,0.1)" : "transparent", border: `1px solid ${activeCategory === cat ? "rgba(255,255,255,0.2)" : "#2a2a2a"}`, color: activeCategory === cat ? "#f5f5f7" : "#3a3a3a" }}>
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {checkoutSample && <SampleCheckoutModal sample={checkoutSample} onClose={() => setCheckoutSample(null)} />}

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#f5f5f7" }}>
            {TAB_OPTIONS.find((t) => t.value === activeType)?.label}
          </h1>
          {!loading && (
            <p className="text-sm" style={{ color: "#86868b" }}>
              {isPack ? packs.length : samples.length} {(isPack ? packs.length : samples.length) === 1 ? "resultat" : "resultater"}
            </p>
          )}
        </div>

        {loading ? (
          isPack
            ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton rounded-2xl" style={{ height: 280 }} />
                ))}
              </div>
            : <SkeletonRows count={8} />
        ) : isPack ? (
          packs.length === 0 ? (
            <div className="mt-20 text-center" style={{ color: "#3a3a3a" }}>
              <Package size={40} className="mx-auto mb-4" style={{ color: "#2a2a2a" }} />
              <p className="text-lg font-medium">{debouncedQuery ? "Ingen pakker funnet" : "Ingen pakker publisert enda"}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {packs.map((pack) => <PackGridCard key={pack.id} pack={pack} />)}
              </div>
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <button onClick={() => void loadItems(activeType, debouncedQuery, activeCategory, genre, activeVst, false)} disabled={loadingMore}
                    className="rounded-xl px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#f5f5f7", border: "1px solid #2a2a2a" }}>
                    {loadingMore ? "Laster..." : "Last inn flere"}
                  </button>
                </div>
              )}
            </>
          )
        ) : samples.length === 0 ? (
          <div className="mt-20 text-center" style={{ color: "#3a3a3a" }}>
            <p className="text-lg font-medium">Ingen resultater</p>
            <p className="mt-1 text-sm">Prøv å justere filtrene</p>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-4 px-4 text-xs font-medium uppercase tracking-wider" style={{ color: "#3a3a3a" }}>
              <div style={{ width: 36 }} />
              <div style={{ width: 40 }} />
              <div className="flex-1">Tittel</div>
              {isPreset && <div className="hidden sm:block" style={{ width: 110 }}>Kategori</div>}
              {isPreset && <div className="hidden sm:block" style={{ width: 110 }}>VST</div>}
              {!isPreset && <div className="hidden lg:block" style={{ width: 200 }}>Tags</div>}
              <div style={{ width: 80, textAlign: "right" }}>Pris</div>
              <div style={{ width: 76 }} />
            </div>
            <div>
              {samples.map((s) => {
                const isPackType = s.item_type === "sample-pack" || s.item_type === "preset-pack";
                return isPackType
                  ? <SamplePackCard key={s.id} sample={s} isActive={currentBeat?.id === s.id} isPlaying={currentBeat?.id === s.id && isPlaying} onToggle={toggleSample} onBuy={setCheckoutSample} />
                  : <SampleCard key={s.id} sample={s} isActive={currentBeat?.id === s.id} isPlaying={currentBeat?.id === s.id && isPlaying} isSelected={selectedId === s.id} onToggle={toggleSample} onBuy={setCheckoutSample} />;
              })}
            </div>
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button onClick={() => void loadItems(activeType, debouncedQuery, activeCategory, genre, activeVst, false)} disabled={loadingMore}
                  className="rounded-xl px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#f5f5f7", border: "1px solid #2a2a2a" }}>
                  {loadingMore ? "Laster..." : "Last inn flere"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
