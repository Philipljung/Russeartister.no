"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { Profile } from "./supabase/types";

export type PlayableItem = {
  id: string;
  title: string;
  audio_preview_url: string | null;
  cover_url: string | null;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  producer?: Profile;
};

type PlayerContextType = {
  currentBeat: PlayableItem | null;
  isPlaying: boolean;
  toggleBeat: (item: PlayableItem) => void;
  pausePlayer: () => void;
  stopPlayer: () => void;
  clearPlayer: () => void;
};

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentBeat, setCurrentBeat] = useState<PlayableItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleBeat = useCallback((item: PlayableItem) => {
    setCurrentBeat((prev) => {
      if (prev?.id === item.id) return prev;
      return item;
    });
    setIsPlaying((prevPlaying) => {
      if (currentBeat?.id === item.id) return !prevPlaying;
      return true;
    });
  }, [currentBeat?.id]);

  const pausePlayer = useCallback(() => setIsPlaying(false), []);
  const stopPlayer = useCallback(() => setIsPlaying(false), []);
  const clearPlayer = useCallback(() => { setCurrentBeat(null); setIsPlaying(false); }, []);

  return (
    <PlayerContext.Provider value={{ currentBeat, isPlaying, toggleBeat, pausePlayer, stopPlayer, clearPlayer }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
