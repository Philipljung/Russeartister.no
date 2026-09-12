"use client";

import { useState, useEffect } from "react";
import { PlayerProvider } from "@/lib/player-context";
import { ToastProvider } from "@/lib/toast-context";
import AudioPlayer from "./AudioPlayer";
import AppSkeleton from "./AppSkeleton";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <AppSkeleton />;

  return (
    <ToastProvider>
      <PlayerProvider>
        {children}
        <AudioPlayer />
      </PlayerProvider>
    </ToastProvider>
  );
}
