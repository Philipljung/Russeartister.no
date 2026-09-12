"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Pause, Share2, ChevronLeft } from "lucide-react";
import type { Beat } from "@/lib/supabase/types";
import { usePlayer } from "@/lib/player-context";
import { useToast } from "@/lib/toast-context";
import dynamic from "next/dynamic";
const BeatCheckoutModal = dynamic(() => import("@/components/BeatCheckoutModal"), { ssr: false });
import BeatCard from "@/components/BeatCard";
import { slugifyName } from "@/lib/slugify";

function genreColor(genre: string): string {
  const palette = ["#1a1040", "#001a2e", "#1a2e00", "#2e1a00", "#001e14", "#14001e", "#1e0a0a", "#00141e"];
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function getFileExt(url: string | null): string | null {
  if (!url) return null;
  const filename = url.split("/").pop()?.split("?")[0] ?? "";
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 6 ? ext : null;
}

export default function BeatDetailClient({
  beat,
  recommended,
  exclusiveAvailable,
}: {
  beat: Beat;
  recommended: Beat[];
  exclusiveAvailable: boolean;
}) {
  const { currentBeat, isPlaying, toggleBeat } = usePlayer();
  const { toast } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [exclusiveMode, setExclusiveMode] = useState(false);

  const isActive = currentBeat?.id === beat.id;
  const isCurrentlyPlaying = isActive && isPlaying;

  const producer = beat.producer;
  const coverImg = beat.cover_url ?? producer?.avatar_url ?? null;
  const coverBg = coverImg ? undefined : genreColor(beat.genre);

  const projectFileExt = getFileExt(beat.project_file_url);
  const hasProjectFile = !!beat.project_file_url;

  function openCheckout(exclusive = false) {
    setExclusiveMode(exclusive);
    setCheckoutOpen(true);
  }

  async function handleShare() {
    await navigator.clipboard.writeText(`${window.location.origin}/later/${beat.id}`);
    toast("Lenke kopiert!");
  }

  async function handleFreeDownload() {
    const res = await fetch(`/api/beats/free-download?beatId=${beat.id}`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
    else toast("Nedlasting feilet. Prøv igjen.");
  }

  const props: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Sjanger", value: beat.genre },
    { label: "BPM", value: String(beat.bpm) },
    ...(beat.key ? [{ label: "Skala", value: beat.key }] : []),
    ...(beat.vocal_type ? [{ label: "Vokal", value: beat.vocal_type === "med_vokal" ? "Med vokal" : "Uten vokal" }] : []),
    { label: "Prosjektfil", value: hasProjectFile ? `Ja${projectFileExt ? ` (${projectFileExt})` : ""}` : "Nei", highlight: hasProjectFile },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#080808" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(180deg, #1a1a1a 0%, #080808 100%)" }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
          <Link
            href="/later"
            className="mb-8 inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-60"
            style={{ color: "#86868b" }}
          >
            <ChevronLeft size={14} />
            Låter
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Cover */}
            <div className="relative shrink-0 w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl"
              style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.7)", backgroundColor: coverBg ?? "#2a2a2a" }}>
              {coverImg && <Image src={coverImg} alt={beat.title} fill className="object-cover" sizes="256px" />}
              <button
                onClick={() => toggleBeat(beat)}
                className="absolute inset-0 flex items-center justify-center transition-all"
                style={{ background: isCurrentlyPlaying ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.25)" }}
              >
                {isCurrentlyPlaying
                  ? <Pause size={36} fill="#f5f5f7" color="#f5f5f7" />
                  : <Play size={36} fill="#f5f5f7" color="#f5f5f7" style={{ marginLeft: 4 }} />}
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ minHeight: 200 }}>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "#86868b" }}>Låt</p>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 leading-tight" style={{ color: "#f5f5f7" }}>
                  {beat.title}
                </h1>
                <Link
                  href={`/profile/${slugifyName(producer?.display_name ?? producer?.username ?? "")}`}
                  className="text-base hover:underline font-medium"
                  style={{ color: "#86868b" }}
                >
                  {producer?.display_name ?? "Ukjent"}
                </Link>

                {beat.description && (
                  <p className="mt-4 text-sm leading-relaxed" style={{ color: "#3a3a3a", maxWidth: 560 }}>
                    {beat.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-5">
                  {props.map(({ label, value, highlight }) => (
                    <div key={label} className="flex items-center gap-2 rounded-full px-3 py-1.5"
                      style={{ background: "rgba(255,255,255,0.06)" }}>
                      <span className="text-xs" style={{ color: "#86868b" }}>{label}</span>
                      <div style={{ width: 1, height: 10, background: "#2a2a2a" }} />
                      <span className="text-xs font-semibold" style={{ color: highlight ? "#34d399" : "#f5f5f7" }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {beat.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {beat.tags.map((tag) => (
                      <span key={tag} className="rounded-full px-2.5 py-0.5 text-xs"
                        style={{ background: "rgba(255,255,255,0.04)", color: "#3a3a3a" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-8">
                <div className="flex flex-col gap-0.5 mr-2">
                  <span className="text-xs" style={{ color: "#3a3a3a" }}>Pris</span>
                  <span className="text-2xl font-black" style={{ color: "#f5f5f7" }}>
                    {beat.price === 0 ? "Gratis" : `kr ${beat.price.toLocaleString("nb-NO")}`}
                  </span>
                </div>
                {beat.price === 0 ? (
                  <button onClick={handleFreeDownload}
                    className="rounded-full px-7 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                    style={{ background: "#f5f5f7", color: "#080808" }}>
                    Last ned
                  </button>
                ) : (
                  <button onClick={() => openCheckout(false)}
                    className="rounded-full px-7 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                    style={{ background: "#f5f5f7", color: "#080808" }}>
                    Kjøp
                  </button>
                )}
                {exclusiveAvailable && (
                  <button onClick={() => openCheckout(true)}
                    className="rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ background: "rgba(234,179,8,0.1)", color: "#eab308", border: "1px solid rgba(234,179,8,0.25)" }}>
                    Eksklusiv · kr {beat.exclusive_price!.toLocaleString("nb-NO")}
                  </button>
                )}
                <button onClick={handleShare}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm transition-opacity hover:opacity-70"
                  style={{ color: "#86868b", background: "rgba(255,255,255,0.06)" }}>
                  <Share2 size={13} />
                  Del
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended */}
      {recommended.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#3a3a3a" }}>
            Lignende låter
          </p>
          <div
            className="mb-2 flex items-center gap-4 px-4 text-xs font-medium uppercase tracking-wider"
            style={{ color: "#3a3a3a" }}
          >
            <div style={{ width: 36 }} /><div style={{ width: 40 }} />
            <div className="flex-1">Tittel</div>
            <div className="hidden sm:block" style={{ width: 72 }}>BPM / Skala</div>
            <div className="hidden lg:block" style={{ width: 220 }}>Tags</div>
            <div style={{ width: 64, textAlign: "right" }}>Pris</div>
            <div style={{ width: 60 }} />
          </div>
          {recommended.map((b) => <BeatCard key={b.id} beat={b} />)}
        </div>
      )}

      {checkoutOpen && (
        <BeatCheckoutModal beat={beat} onClose={() => setCheckoutOpen(false)} initialExclusive={exclusiveMode} />
      )}
    </div>
  );
}
