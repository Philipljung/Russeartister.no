"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { fetchPublicRemakes } from "@/lib/fetchRemakes";
import RemakeCard from "@/components/RemakeCard";
import type { Remake } from "@/lib/supabase/types";

export default function RemakesPage() {
  const [remakes, setRemakes] = useState<Remake[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

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

  const filtered = useMemo(() => {
    if (!debouncedQuery) return remakes;
    const q = debouncedQuery.toLowerCase();
    return remakes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.original_song.toLowerCase().includes(q) ||
        r.genre.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.producer?.display_name?.toLowerCase().includes(q)
    );
  }, [remakes, debouncedQuery]);

  function handleBuy(remake: Remake) {
    // TODO: wire up checkout modal (same pattern as BeatCheckoutModal)
    alert(`Kjøp av "${remake.title}" kommer snart!`);
  }

  return (
    <>
      {/* Sticky search bar */}
      <div
        className="sticky top-14 z-40 border-b"
        style={{
          background: "rgba(8,8,8,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "#1e1e1e",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-4">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#86868b" }} />
            <input
              type="text"
              placeholder="Søk etter remakes, original sang, sjanger..."
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
            <p className="text-lg font-medium">{query ? "Ingen remakes funnet" : "Ingen remakes enda"}</p>
            {query && <p className="mt-1 text-sm">Prøv et annet søk</p>}
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
              <div className="flex-1">Tittel / Original</div>
              <div className="hidden sm:block" style={{ width: 72 }}>BPM / Skala</div>
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
                  onToggle={toggleRemake}
                  onBuy={handleBuy}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
