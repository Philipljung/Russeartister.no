"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Play, Pause, X, Volume2 } from "lucide-react";
import { usePlayer } from "@/lib/player-context";

function formatTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function genreColor(genre: string): string {
  const palette = [
    "#1a1040", "#001a2e", "#1a2e00", "#2e1a00",
    "#001e14", "#14001e", "#1e0a0a", "#00141e",
  ];
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function AudioPlayer() {
  const { currentBeat, isPlaying, pausePlayer, stopPlayer, clearPlayer, toggleBeat } = usePlayer();
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);

  // Show on beats, profile, remakes, samples, presets, and pack pages
  const showPlayer =
    pathname.startsWith("/later") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/remakes") ||
    pathname.startsWith("/samples") ||
    pathname.startsWith("/packs") ||
    pathname.startsWith("/presets") ||
    pathname.startsWith("/preset-packs") ||
    pathname.startsWith("/sample-packs");
  useEffect(() => {
    if (!showPlayer) clearPlayer();
  }, [showPlayer, clearPlayer]);

  // Sync audio element with player context state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentBeat) return;

    const src = currentBeat.audio_preview_url ?? "";
    if (audio.dataset.beatId !== currentBeat.id) {
      audio.dataset.beatId = currentBeat.id;
      audio.src = src;
      audio.currentTime = 0;
      setCurrentTime(0);
      setDuration(0);
    }

    if (isPlaying && src) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentBeat, isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function seek(e: React.PointerEvent) {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !audioRef.current || !duration) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  }

  if (!currentBeat || !showPlayer) return null;

  const progress = duration > 0 ? currentTime / duration : 0;
  const coverImg = currentBeat.cover_url ?? currentBeat.producer?.avatar_url ?? null;
  const coverBg = coverImg ? undefined : genreColor(currentBeat.genre ?? "");

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-2 md:gap-4 px-3 md:px-6"
      style={{
        height: 64,
        background: "rgba(12,12,12,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid #1e1e1e",
      }}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={stopPlayer}
      />

      {/* Cover + info — constrained width on mobile */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0" style={{ width: "auto", maxWidth: "40vw", minWidth: 0 }}>
        <div
          className="shrink-0 rounded-lg"
          style={{
            width: 38,
            height: 38,
            backgroundColor: coverBg ?? "transparent",
            backgroundImage: coverImg ? `url(${coverImg})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        />
        <div className="min-w-0">
          <p className="truncate text-xs md:text-sm font-semibold" style={{ color: "#f5f5f7" }}>
            {currentBeat.title}
          </p>
          <p className="truncate text-xs mt-0.5 hidden sm:block" style={{ color: "#86868b" }}>
            {currentBeat.producer?.display_name ?? "Ukjent"}
          </p>
        </div>
      </div>

      {/* Play / Pause */}
      <button
        onClick={() => toggleBeat(currentBeat)}
        className="shrink-0 flex items-center justify-center rounded-full transition-all"
        style={{
          width: 36,
          height: 36,
          background: "#f5f5f7",
          color: "#080808",
        }}
      >
        {isPlaying ? (
          <Pause size={14} fill="#080808" />
        ) : (
          <Play size={14} fill="#080808" />
        )}
      </button>

      {/* Progress bar + times */}
      <div className="flex flex-1 items-center gap-2 md:gap-3 min-w-0">
        <span className="shrink-0 tabular-nums text-xs hidden sm:block" style={{ color: "#86868b", minWidth: 32 }}>
          {formatTime(currentTime)}
        </span>

        {/* Seekable track */}
        <div
          ref={progressRef}
          className="relative flex-1 cursor-pointer rounded-full"
          style={{ height: 4, background: "#2a2a2a" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seek(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1) return;
            seek(e);
          }}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ background: "#f5f5f7", width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-125"
            style={{
              width: 12,
              height: 12,
              background: "#f5f5f7",
              left: `calc(${progress * 100}% - 6px)`,
              boxShadow: "0 0 4px rgba(0,0,0,0.6)",
            }}
          />
        </div>

        <span className="shrink-0 tabular-nums text-xs hidden sm:block" style={{ color: "#3a3a3a", minWidth: 32 }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* BPM · Key */}
      {(currentBeat.bpm || currentBeat.key) && (
        <div className="hidden shrink-0 text-right md:block" style={{ width: 80 }}>
          {currentBeat.bpm && (
            <p className="text-xs" style={{ color: "#86868b" }}>
              {currentBeat.bpm} BPM
            </p>
          )}
          {currentBeat.key && (
            <p className="text-xs mt-0.5" style={{ color: "#3a3a3a" }}>
              {currentBeat.key}
            </p>
          )}
        </div>
      )}

      {/* Volume */}
      <div className="relative shrink-0 hidden sm:flex items-center">
        <button
          onClick={() => setShowVolume((v) => !v)}
          className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-60"
          style={{ color: "#86868b" }}
        >
          <Volume2 size={15} />
        </button>
        {showVolume && (
          <div
            className="absolute bottom-10 right-0 flex flex-col items-center gap-1 rounded-xl px-3 py-3"
            style={{ background: "rgba(28,28,28,0.98)", border: "1px solid #2a2a2a", zIndex: 60 }}
          >
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{ writingMode: "vertical-lr", direction: "rtl", height: 80, width: 20, accentColor: "#f5f5f7", cursor: "pointer" }}
            />
            <span className="text-xs tabular-nums" style={{ color: "#86868b" }}>
              {Math.round(volume * 100)}
            </span>
          </div>
        )}
      </div>

      {/* Close */}
      <button
        onClick={clearPlayer}
        className="shrink-0 flex items-center justify-center rounded-lg transition-opacity hover:opacity-60"
        style={{ color: "#3a3a3a" }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
