"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { fetchPublicRemakes } from "@/lib/fetchRemakes";
import RemakeCard from "@/components/RemakeCard";
import RemakeCheckoutModal from "@/components/RemakeCheckoutModal";
import type { Remake } from "@/lib/supabase/types";

export default function RemakesPage() {
  const [remakes, setRemakes] = useState<Remake[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeDaw, setActiveDaw] = useState("");
  const [includeVsts, setIncludeVsts] = useState<string[]>([]);
  const [excludeVsts, setExcludeVsts] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkoutRemake, setCheckoutRemake] = useState<Remake | null>(null);

  // Audio playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const toggleRemake = useCallback((remake: Remake) => {
    if (!remake.audio_preview_url) return;

    if (playingId === remake.id) {
      if (audioRef.current) {
        if (audioPlaying) { audioRef.current.pause(); setAudioPlaying(false); }
        else { void audioRef.current.play(); setAudioPlaying(true); }
      }
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio(remake.audio_preview_url);
    audio.onended = () => { setPlayingId(null); setAudioPlaying(false); };
    audioRef.current = audio;
    setPlayingId(remake.id);
    void audio.play();
    setAudioPlaying(true);
  }, [playingId, audioPlaying]);

  useEffect(() => { return () => { audioRef.current?.pause(); }; }, []);

  useEffect(() => {
    fetchPublicRemakes().then((data) => { setRemakes(data); setLoading(false); });
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  const daws = useMemo(() => {
    const all = remakes.map((r) => r.daw).filter(Boolean) as string[];
    return Array.from(new Set(all)).sort();
  }, [remakes]);

  const vsts = useMemo(() => {
    const all = remakes.flatMap((r) => r.vsts ?? []);
    return Array.from(new Set(all)).sort();
  }, [remakes]);

  const filtered = useMemo(() => {
    let result = [...remakes];
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.daw?.toLowerCase().includes(q) ?? false) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          r.producer?.display_name?.toLowerCase().includes(q)
      );
    }
    if (activeDaw) result = result.filter((r) => r.daw === activeDaw);
    if (includeVsts.length > 0) {
      result = result.filter((r) => includeVsts.some((v) => r.vsts?.includes(v)));
    }
    if (excludeVsts.length > 0) {
      result = result.filter((r) => !excludeVsts.some((v) => r.vsts?.includes(v)));
    }
    return result;
  }, [remakes, debouncedQuery, activeDaw, includeVsts, excludeVsts]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!["ArrowUp", "ArrowDown"].includes(e.key)) return;
    if (filtered.length === 0) return;
    e.preventDefault();
    setSelectedId((prev) => {
      const idx = filtered.findIndex((r) => r.id === prev);
      if (e.key === "ArrowDown") {
        const next = filtered[Math.min(idx + 1, filtered.length - 1)];
        toggleRemake(next);
        return next.id;
      }
      const next = filtered[Math.max(idx - 1, 0)];
      toggleRemake(next);
      return next.id;
    });
  }, [filtered, toggleRemake]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function handleBuy(remake: Remake) {
    setCheckoutRemake(remake);
  }

  return (
    <>
      {/* Sticky search + DAW filter bar */}
      <div
        className="sticky top-14 z-40 border-b"
        style={{
          background: "rgba(8,8,8,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "#1e1e1e",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-4 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#86868b" }} />
            <input
              type="text"
              placeholder="Søk etter remakes, producer, tags..."
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

          {/* DAW chips */}
          {daws.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {daws.map((d) => (
                <button
                  key={d}
                  onClick={() => setActiveDaw(activeDaw === d ? "" : d)}
                  className="shrink-0 rounded-xl px-3 py-1.5 text-xs transition-all whitespace-nowrap"
                  style={{
                    background: activeDaw === d ? "rgba(99,102,241,0.12)" : "transparent",
                    border: `1px solid ${activeDaw === d ? "rgba(99,102,241,0.35)" : "#2a2a2a"}`,
                    color: activeDaw === d ? "#818cf8" : "#3a3a3a",
                  }}
                >
                  {d}
                </button>
              ))}
              {activeDaw && (
                <button
                  onClick={() => setActiveDaw("")}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs ml-auto"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #2a2a2a", color: "#86868b" }}
                >
                  <X size={12} /> Nullstill
                </button>
              )}
            </div>
          )}

          {/* VST chips */}
          {vsts.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              <span className="shrink-0 text-xs" style={{ color: "#3a3a3a" }}>VST</span>
              {vsts.map((v) => {
                const isIncluded = includeVsts.includes(v);
                const isExcluded = excludeVsts.includes(v);
                return (
                  <button
                    key={v}
                    onClick={() => {
                      if (!isIncluded && !isExcluded) {
                        // neutral -> include
                        setIncludeVsts([...includeVsts, v]);
                      } else if (isIncluded) {
                        // include -> exclude
                        setIncludeVsts(includeVsts.filter((x) => x !== v));
                        setExcludeVsts([...excludeVsts, v]);
                      } else {
                        // exclude -> neutral
                        setExcludeVsts(excludeVsts.filter((x) => x !== v));
                      }
                    }}
                    className="shrink-0 rounded-xl px-3 py-1.5 text-xs transition-all whitespace-nowrap"
                    style={{
                      background: isIncluded
                        ? "rgba(16,185,129,0.12)"
                        : isExcluded
                        ? "rgba(255,59,48,0.12)"
                        : "transparent",
                      border: `1px solid ${isIncluded
                        ? "rgba(16,185,129,0.35)"
                        : isExcluded
                        ? "rgba(255,59,48,0.35)"
                        : "#2a2a2a"}`,
                      color: isIncluded ? "#34d399" : isExcluded ? "#ff6b6b" : "#3a3a3a",
                    }}
                  >
                    {v}
                  </button>
                );
              })}
              {(includeVsts.length > 0 || excludeVsts.length > 0) && (
                <button
                  onClick={() => { setIncludeVsts([]); setExcludeVsts([]); }}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs ml-auto"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #2a2a2a", color: "#86868b" }}
                >
                  <X size={12} /> Nullstill
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#f5f5f7" }}>Remakes</h1>
          {!loading && (
            <p className="text-sm" style={{ color: "#86868b" }}>
              {filtered.length} {filtered.length === 1 ? "resultat" : "resultater"}
            </p>
          )}
        </div>

        {loading ? (
          <div className="mt-20 text-center" style={{ color: "#3a3a3a" }}>
            <p className="text-sm">Laster remakes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-20 text-center" style={{ color: "#3a3a3a" }}>
            <p className="text-lg font-medium">{query || activeDaw || (includeVsts.length > 0 || excludeVsts.length > 0) ? "Ingen remakes funnet" : "Ingen remakes enda"}</p>
            {(query || activeDaw || includeVsts.length > 0 || excludeVsts.length > 0) && <p className="mt-1 text-sm">Prøv et annet søk</p>}
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
              <div className="hidden sm:block" style={{ width: 120 }}>DAW</div>
              <div className="hidden lg:block" style={{ width: 200 }}>Tags</div>
              <div style={{ width: 64, textAlign: "right" }}>Pris</div>
              <div style={{ width: 60 }} />
            </div>

            <div>
              {filtered.map((remake) => (
                <RemakeCard
                  key={remake.id}
                  remake={remake}
                  isActive={playingId === remake.id}
                  isPlaying={playingId === remake.id && audioPlaying}
                  isSelected={selectedId === remake.id}
                  onToggle={toggleRemake}
                  onBuy={handleBuy}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {checkoutRemake && (
        <RemakeCheckoutModal remake={checkoutRemake} onClose={() => setCheckoutRemake(null)} />
      )}
    </>
  );
}
