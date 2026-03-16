"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import BeatCard from "@/components/BeatCard";
import BeatFilters, { DEFAULT_FILTERS, Filters, BPM_MIN, BPM_MAX, PRICE_MIN, PRICE_MAX } from "@/components/BeatFilters";
import HeroCarousel from "@/components/HeroCarousel";
import { fetchPublicBeats } from "@/lib/fetchBeats";
import type { Beat } from "@/lib/supabase/types";

export default function LaterPage() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicBeats().then((data) => {
      setBeats(data);
      setLoading(false);
    });
  }, []);

  const genres = useMemo(() => {
    const all = beats.map((b) => b.genre);
    return Array.from(new Set(all)).sort();
  }, [beats]);

  const filtered = useMemo(() => {
    let result = [...beats];

    if (filters.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.genre.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q)) ||
          b.producer?.display_name?.toLowerCase().includes(q)
      );
    }

    if (filters.genre) result = result.filter((b) => b.genre === filters.genre);
    if (filters.vocal) result = result.filter((b) => b.vocal_type === filters.vocal);
    if (filters.minBpm > BPM_MIN) result = result.filter((b) => b.bpm >= filters.minBpm);
    if (filters.maxBpm < BPM_MAX) result = result.filter((b) => b.bpm <= filters.maxBpm);
    if (filters.minPrice > PRICE_MIN) result = result.filter((b) => b.price >= filters.minPrice);
    if (filters.maxPrice < PRICE_MAX) result = result.filter((b) => b.price <= filters.maxPrice);

    switch (filters.sortBy) {
      case "price_asc": result.sort((a, b) => a.price - b.price); break;
      case "price_desc": result.sort((a, b) => b.price - a.price); break;
      case "bpm_asc": result.sort((a, b) => a.bpm - b.bpm); break;
      case "bpm_desc": result.sort((a, b) => b.bpm - a.bpm); break;
    }

    return result;
  }, [beats, filters]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!["ArrowUp", "ArrowDown"].includes(e.key)) return;
    if (filtered.length === 0) return;
    e.preventDefault();
    setSelectedId((prev) => {
      const idx = filtered.findIndex((b) => b.id === prev);
      if (e.key === "ArrowDown") return filtered[Math.min(idx + 1, filtered.length - 1)].id;
      return filtered[Math.max(idx - 1, 0)].id;
    });
  }, [filtered]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <HeroCarousel />
      <BeatFilters filters={filters} genres={genres} onChange={setFilters} />

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#f5f5f7" }}>
            Låter
          </h1>
          {!loading && (
            <p className="text-sm" style={{ color: "#86868b" }}>
              {filtered.length} {filtered.length === 1 ? "låt" : "låter"}
            </p>
          )}
        </div>

        {loading ? (
          <div className="mt-20 text-center" style={{ color: "#3a3a3a" }}>
            <p className="text-sm">Laster låter...</p>
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

            {filtered.length === 0 ? (
              <div className="mt-20 text-center" style={{ color: "#3a3a3a" }}>
                <p className="text-lg font-medium">Ingen låter funnet</p>
                <p className="mt-1 text-sm">Prøv å justere filtrene dine</p>
              </div>
            ) : (
              <div>
                {filtered.map((beat) => (
                  <BeatCard
                    key={beat.id}
                    beat={beat}
                    isSelected={selectedId === beat.id}
                    onSelect={() => setSelectedId(beat.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
