"use client";

import { PlayerProvider } from "@/lib/player-context";
import { ToastProvider } from "@/lib/toast-context";
import AudioPlayer from "./AudioPlayer";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PlayerProvider>
        {children}
        <AudioPlayer />
      </PlayerProvider>
    </ToastProvider>
  );
}
