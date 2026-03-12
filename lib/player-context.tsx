"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { Beat } from "./supabase/types";

type PlayerContextType = {
  currentBeat: Beat | null;
  isPlaying: boolean;
  toggleBeat: (beat: Beat) => void;
  pausePlayer: () => void;
  stopPlayer: () => void;
};

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentBeat, setCurrentBeat] = useState<Beat | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleBeat = useCallback((beat: Beat) => {
    setCurrentBeat((prev) => {
      if (prev?.id === beat.id) {
        setIsPlaying((p) => !p);
        return prev;
      }
      setIsPlaying(true);
      return beat;
    });
  }, []);

  const pausePlayer = useCallback(() => setIsPlaying(false), []);
  const stopPlayer = useCallback(() => setIsPlaying(false), []);

  return (
    <PlayerContext.Provider value={{ currentBeat, isPlaying, toggleBeat, pausePlayer, stopPlayer }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
