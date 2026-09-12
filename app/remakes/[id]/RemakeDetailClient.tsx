"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Pause, Share2, ChevronLeft } from "lucide-react";
import type { Remake } from "@/lib/supabase/types";
import { useToast } from "@/lib/toast-context";
import dynamic from "next/dynamic";
const RemakeCheckoutModal = dynamic(() => import("@/components/RemakeCheckoutModal"), { ssr: false });
import RemakeCard from "@/components/RemakeCard";
import { slugifyName } from "@/lib/slugify";
import { usePlayer } from "@/lib/player-context";

function genreColor(seed: string): string {
  const palette = ["#1a1040", "#001a2e", "#1a2e00", "#2e1a00", "#001e14", "#14001e", "#1e0a0a", "#00141e"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function RemakeDetailClient({
  remake,
  recommended,
}: {
  remake: Remake;
  recommended: Remake[];
}) {
  const { toast } = useToast();
  const { currentBeat, isPlaying, toggleBeat } = usePlayer();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  async function handleFreeDownload() {
    const res = await fetch(`/api/free-download?type=remake&id=${remake.id}`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else toast("Nedlasting feilet. Prøv igjen.");
  }

  const producer = remake.producer;
  const coverImg = remake.cover_url ?? producer?.avatar_url ?? null;
  const coverBg = coverImg ? undefined : genreColor(remake.title);
  const thisIsPlaying = currentBeat?.id === remake.id && isPlaying;

  async function handleShare() {
    await navigator.clipboard.writeText(window.location.origin + "/remakes/" + remake.id);
    toast("Lenke kopiert!");
  }

  const props: { label: string; value: string }[] = [
    ...(remake.daw ? [{ label: "DAW", value: remake.daw }] : []),
    ...(remake.bpm ? [{ label: "BPM", value: String(remake.bpm) }] : []),
    ...(remake.key ? [{ label: "Skala", value: remake.key }] : []),
    ...(remake.genre ? [{ label: "Sjanger", value: remake.genre }] : []),
  ];

  return (
    <div className="min-h-screen" style={{ background: "#080808" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(180deg, #1a1a1a 0%, #080808 100%)" }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
          <Link href="/remakes"
            className="mb-8 inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-60"
            style={{ color: "#86868b" }}>
            <ChevronLeft size={14} />
            Remakes
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Cover */}
            <div className="relative shrink-0 w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.7)", backgroundColor: coverBg ?? "#2a2a2a" }}>
              {coverImg && <Image src={coverImg} alt={remake.title} fill className="object-cover" sizes="256px" />}
              <button
                onClick={() => toggleBeat(remake)}
                className="absolute inset-0 flex items-center justify-center transition-all"
                style={{ background: thisIsPlaying ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.25)", cursor: remake.audio_preview_url ? "pointer" : "default" }}
              >
                {thisIsPlaying
                  ? <Pause size={36} fill="#f5f5f7" color="#f5f5f7" />
                  : <Play size={36} fill="#f5f5f7" color="#f5f5f7" style={{ marginLeft: 4 }} />}
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ minHeight: 200 }}>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "#86868b" }}>Remake</p>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 leading-tight" style={{ color: "#f5f5f7" }}>
                  {remake.title}
                </h1>
                <Link
                  href={`/profile/${slugifyName(producer?.display_name ?? producer?.username ?? "")}`}
                  className="text-base hover:underline font-medium"
                  style={{ color: "#86868b" }}
                >
                  {producer?.display_name ?? "Ukjent"}
                </Link>

                {remake.description && (
                  <p className="mt-4 text-sm leading-relaxed" style={{ color: "#3a3a3a", maxWidth: 560 }}>
                    {remake.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-5">
                  {props.map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2 rounded-full px-3 py-1.5"
                      style={{ background: "rgba(255,255,255,0.06)" }}>
                      <span className="text-xs" style={{ color: "#86868b" }}>{label}</span>
                      <div style={{ width: 1, height: 10, background: "#2a2a2a" }} />
                      <span className="text-xs font-semibold" style={{ color: "#f5f5f7" }}>{value}</span>
                    </div>
                  ))}
                </div>

                {remake.vsts && remake.vsts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {remake.vsts.map((vst) => (
                      <span key={vst} className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>
                        {vst}
                      </span>
                    ))}
                  </div>
                )}

                {remake.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {remake.tags.map((tag) => (
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
                    {remake.price === 0 ? "Gratis" : `kr ${remake.price.toLocaleString("nb-NO")}`}
                  </span>
                </div>
                <button
                  onClick={remake.price === 0 ? handleFreeDownload : () => setCheckoutOpen(true)}
                  className="rounded-full px-7 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ background: "#f5f5f7", color: "#080808" }}>
                  {remake.price === 0 ? "Last ned" : "Kjøp"}
                </button>
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
            Lignende remakes
          </p>
          <div className="mb-2 flex items-center gap-4 px-4 text-xs font-medium uppercase tracking-wider" style={{ color: "#3a3a3a" }}>
            <div style={{ width: 36 }} /><div style={{ width: 40 }} />
            <div className="flex-1">Tittel</div>
            <div className="hidden sm:block" style={{ width: 120 }}>DAW</div>
            <div className="hidden lg:block" style={{ width: 200 }}>Tags</div>
            <div style={{ width: 64, textAlign: "right" }}>Pris</div>
            <div style={{ width: 60 }} />
          </div>
          {recommended.map((r) => (
            <RemakeCard
              key={r.id}
              remake={r}
              isActive={currentBeat?.id === r.id}
              isPlaying={currentBeat?.id === r.id && isPlaying}
              onToggle={(rec) => toggleBeat(rec)}
              onBuy={() => { }}
            />
          ))}
        </div>
      )}

      {checkoutOpen && (
        <RemakeCheckoutModal remake={remake} onClose={() => setCheckoutOpen(false)} />
      )}
    </div>
  );
}
