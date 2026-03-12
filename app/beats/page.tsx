"use client";

import { useState, useMemo, useEffect } from "react";
import BeatCard from "@/components/BeatCard";
import BeatFilters, { DEFAULT_FILTERS, Filters, BPM_MIN, BPM_MAX, PRICE_MAX } from "@/components/BeatFilters";
import { fetchPublicBeats } from "@/lib/fetchBeats";
import type { Beat } from "@/lib/supabase/types";

export default function BeatsPage() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

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
    if (filters.minBpm > BPM_MIN) result = result.filter((b) => b.bpm >= filters.minBpm);
    if (filters.maxBpm < BPM_MAX) result = result.filter((b) => b.bpm <= filters.maxBpm);
    if (filters.maxPrice < PRICE_MAX) result = result.filter((b) => b.price <= filters.maxPrice);

    switch (filters.sortBy) {
      case "price_asc": result.sort((a, b) => a.price - b.price); break;
      case "price_desc": result.sort((a, b) => b.price - a.price); break;
      case "bpm_asc": result.sort((a, b) => a.bpm - b.bpm); break;
      case "bpm_desc": result.sort((a, b) => b.bpm - a.bpm); break;
    }

    return result;
  }, [beats, filters]);

  return (
    <>
      <BeatFilters filters={filters} genres={genres} onChange={setFilters} />

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#f5f5f7" }}>
            Beats
          </h1>
          {!loading && (
            <p className="text-sm" style={{ color: "#86868b" }}>
              {filtered.length} {filtered.length === 1 ? "beat" : "beats"}
            </p>
          )}
        </div>

        {loading ? (
          <div className="mt-20 text-center" style={{ color: "#3a3a3a" }}>
            <p className="text-sm">Laster beats...</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div
              className="mb-2 flex items-center gap-4 px-4 text-xs font-medium uppercase tracking-wider"
              style={{ color: "#3a3a3a" }}
            >
              <div style={{ width: 36 }} />
              <div style={{ width: 40 }} />
              <div className="flex-1">Tittel</div>
              <div className="hidden sm:block" style={{ width: 72 }}>BPM / Toneart</div>
              <div className="hidden lg:block" style={{ width: 220 }}>Tags</div>
              <div style={{ width: 64, textAlign: "right" }}>Pris</div>
              <div style={{ width: 60 }} />
            </div>

            {filtered.length === 0 ? (
              <div className="mt-20 text-center" style={{ color: "#3a3a3a" }}>
                <p className="text-lg font-medium">Ingen beats funnet</p>
                <p className="mt-1 text-sm">Prøv å justere filtrene dine</p>
              </div>
            ) : (
              <div>
                {filtered.map((beat) => (
                  <BeatCard key={beat.id} beat={beat} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
