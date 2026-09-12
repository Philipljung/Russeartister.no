"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import BeatCard from "@/components/BeatCard";
import { SkeletonRows } from "@/components/SkeletonRow";
import { DEFAULT_FILTERS } from "@/lib/beatFilterTypes";
import type { Filters } from "@/lib/beatFilterTypes";
const BeatFilters = dynamic(() => import("@/components/BeatFilters"), { ssr: false });
const HeroCarousel = dynamic(() => import("@/components/HeroCarousel"), { ssr: false });
import { fetchPublicBeats } from "@/lib/fetchBeats";
import type { Beat } from "@/lib/supabase/types";

const PAGE_SIZE = 20;

export default function LaterPage() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const offsetRef = useRef(0);

  const load = useCallback(async (currentFilters: Filters, reset: boolean) => {
    const from = reset ? 0 : offsetRef.current;
    const to = from + PAGE_SIZE - 1;

    if (reset) setLoading(true);
    else setLoadingMore(true);

    const data = await fetchPublicBeats({
      query: currentFilters.query,
      genre: currentFilters.genre,
      vocal: currentFilters.vocal,
      minBpm: currentFilters.minBpm,
      maxBpm: currentFilters.maxBpm,
      minPrice: currentFilters.minPrice,
      maxPrice: currentFilters.maxPrice,
      sortBy: currentFilters.sortBy,
      from,
      to,
    });

    if (reset) {
      setBeats(data);
      offsetRef.current = data.length;
    } else {
      setBeats((prev) => [...prev, ...data]);
      offsetRef.current += data.length;
    }

    setHasMore(data.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    offsetRef.current = 0;
    void load(filters, true);
  }, [filters, load]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!["ArrowUp", "ArrowDown"].includes(e.key)) return;
    if (beats.length === 0) return;
    e.preventDefault();
    setSelectedId((prev) => {
      const idx = beats.findIndex((b) => b.id === prev);
      if (e.key === "ArrowDown") return beats[Math.min(idx + 1, beats.length - 1)].id;
      return beats[Math.max(idx - 1, 0)].id;
    });
  }, [beats]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <HeroCarousel />
      <BeatFilters filters={filters} genres={[]} onChange={setFilters} />

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#f5f5f7" }}>Låter</h1>
        </div>

        {loading ? (
          <SkeletonRows count={8} />
        ) : beats.length === 0 ? (
          <div className="mt-20 text-center" style={{ color: "#3a3a3a" }}>
            <p className="text-lg font-medium">Ingen låter funnet</p>
            <p className="mt-1 text-sm">Prøv å justere filtrene dine</p>
          </div>
        ) : (
          <>
            <div
              className="mb-2 flex items-center gap-4 px-4 text-xs font-medium uppercase tracking-wider"
              style={{ color: "#3a3a3a" }}
            >
              <div style={{ width: 36 }} />
              <div style={{ width: 40 }} />
              <div className="flex-1">Tittel</div>
              <div className="hidden sm:block" style={{ width: 72 }}>BPM / Skala</div>
              <div className="hidden lg:block" style={{ width: 220 }}>Tags</div>
              <div style={{ width: 64, textAlign: "right" }}>Pris</div>
              <div style={{ width: 60 }} />
            </div>

            <div>
              {beats.map((beat) => (
                <BeatCard
                  key={beat.id}
                  beat={beat}
                  isSelected={selectedId === beat.id}
                  onSelect={() => setSelectedId(beat.id)}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => void load(filters, false)}
                  disabled={loadingMore}
                  className="rounded-xl px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#f5f5f7", border: "1px solid #2a2a2a" }}
                >
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
