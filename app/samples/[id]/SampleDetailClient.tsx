"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Pause, Share2, ChevronLeft, Sliders, FolderArchive, FileAudio } from "lucide-react";
import type { Sample } from "@/lib/supabase/types";
import { useToast } from "@/lib/toast-context";
import { CATEGORY_LABELS } from "@/lib/sampleCategories";
import dynamic from "next/dynamic";
const SampleCheckoutModal = dynamic(() => import("@/components/SampleCheckoutModal"), { ssr: false });
import SampleCard from "@/components/SampleCard";
import SamplePackCard from "@/components/SamplePackCard";
import { slugifyName } from "@/lib/slugify";
import { usePlayer } from "@/lib/player-context";

function genreColor(seed: string): string {
  const palette = ["#1a1040", "#001a2e", "#1a2e00", "#2e1a00", "#001e14", "#14001e", "#1e0a0a", "#00141e"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function SampleDetailClient({
  sample,
  recommended,
}: {
  sample: Sample;
  recommended: Sample[];
}) {
  const { toast } = useToast();
  const { currentBeat, isPlaying, toggleBeat } = usePlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [localPlaying, setLocalPlaying] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSample, setCheckoutSample] = useState<Sample | null>(null);

  const isPack = sample.item_type === "sample-pack" || sample.item_type === "preset-pack";
  const isPreset = sample.item_type === "preset";
  const isPresetPack = sample.item_type === "preset-pack";
  const canPlay = !!sample.audio_preview_url;

  const producer = sample.producer;
  const coverImg = sample.cover_url ?? producer?.avatar_url ?? null;
  const coverBg = coverImg ? undefined : genreColor(sample.category);

  const typeLabel = isPack
    ? isPresetPack ? "Preset Pack" : "Sample Pack"
    : isPreset ? "Preset" : "Sample";

  function handleTogglePlay() {
    if (!canPlay) return;
    if (audioRef.current) {
      if (localPlaying) { audioRef.current.pause(); setLocalPlaying(false); }
      else { void audioRef.current.play(); setLocalPlaying(true); }
      return;
    }
    const audio = new Audio(sample.audio_preview_url!);
    audio.onended = () => setLocalPlaying(false);
    audioRef.current = audio;
    void audio.play();
    setLocalPlaying(true);
  }

  async function handleFreeDownload() {
    const res = await fetch(`/api/free-download?type=sample&id=${sample.id}`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else toast("Nedlasting feilet. Prøv igjen.");
  }

  async function handleShare() {
    await navigator.clipboard.writeText(window.location.origin + "/samples/" + sample.id);
    toast("Lenke kopiert!");
  }

  const props: { label: string; value: string }[] = [
    { label: "Type", value: typeLabel },
    { label: "Kategori", value: CATEGORY_LABELS[sample.category] ?? sample.category },
    ...(sample.bpm && !isPreset && !isPack ? [{ label: "BPM", value: String(sample.bpm) }] : []),
    ...(sample.key && !isPack ? [{ label: "Skala", value: sample.key }] : []),
    ...((isPreset || isPresetPack) && sample.vst ? [{ label: "VST", value: sample.vst }] : []),
    ...(isPack && sample.pack_files ? [{ label: "Filer", value: `${sample.pack_files.length} filer` }] : []),
  ];

  return (
    <div className="min-h-screen" style={{ background: "#080808" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(180deg, #1a1a1a 0%, #080808 100%)" }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
          <Link href="/samples"
            className="mb-8 inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-60"
            style={{ color: "#86868b" }}>
            <ChevronLeft size={14} />
            Samples & Presets
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Cover */}
            <div className="relative shrink-0 w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.7)", backgroundColor: coverBg ?? "#2a2a2a" }}>
              {coverImg
                ? <Image src={coverImg} alt={sample.title} fill className="object-cover" sizes="256px" />
                : isPack && <FolderArchive size={56} style={{ color: "rgba(255,255,255,0.15)" }} />}
              <button
                onClick={handleTogglePlay}
                className="absolute inset-0 flex items-center justify-center transition-all"
                style={{ background: localPlaying ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.25)", cursor: canPlay ? "pointer" : "default" }}
              >
                {localPlaying
                  ? <Pause size={36} fill="#f5f5f7" color="#f5f5f7" />
                  : !canPlay && isPreset
                    ? <Sliders size={36} color="rgba(255,255,255,0.4)" />
                    : !canPlay && isPack
                      ? <FolderArchive size={36} color="rgba(255,255,255,0.4)" />
                      : <Play size={36} fill="#f5f5f7" color="#f5f5f7" style={{ marginLeft: 4 }} />}
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ minHeight: 200 }}>
              <div>
                <span className="text-xs font-medium rounded-full px-2.5 py-1 mb-3 inline-block"
                  style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}>
                  {typeLabel}
                </span>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 leading-tight" style={{ color: "#f5f5f7" }}>
                  {sample.title}
                </h1>
                <Link
                  href={`/profile/${slugifyName(producer?.display_name ?? producer?.username ?? "")}`}
                  className="text-base hover:underline font-medium"
                  style={{ color: "#86868b" }}
                >
                  {producer?.display_name ?? "Ukjent"}
                </Link>

                {sample.description && (
                  <p className="mt-4 text-sm leading-relaxed" style={{ color: "#3a3a3a", maxWidth: 560 }}>
                    {sample.description}
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

                {sample.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {sample.tags.map((tag) => (
                      <span key={tag} className="rounded-full px-2.5 py-0.5 text-xs"
                        style={{ background: "rgba(255,255,255,0.04)", color: "#3a3a3a" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {isPack && sample.pack_files && sample.pack_files.length > 0 && (
                  <div className="mt-5 rounded-xl px-4 py-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e1e1e" }}>
                    <p className="text-xs font-medium mb-3" style={{ color: "#86868b" }}>
                      {sample.pack_files.length} filer inkludert
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {sample.pack_files.map((name, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <FileAudio size={11} style={{ color: "#3a3a3a", flexShrink: 0 }} />
                          <p className="text-xs font-mono truncate" style={{ color: "#4a4a4a" }}>{name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-8">
                <div className="flex flex-col gap-0.5 mr-2">
                  <span className="text-xs" style={{ color: "#3a3a3a" }}>Pris</span>
                  <span className="text-2xl font-black" style={{ color: "#f5f5f7" }}>
                    {sample.price === 0 ? "Gratis" : `kr ${sample.price.toLocaleString("nb-NO")}`}
                  </span>
                </div>
                <button
                  onClick={sample.price === 0 ? handleFreeDownload : () => setCheckoutOpen(true)}
                  className="rounded-full px-7 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ background: "#f5f5f7", color: "#080808" }}>
                  {sample.price === 0 ? "Last ned" : "Kjøp"}
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
            Lignende
          </p>
          <div className="mb-2 flex items-center gap-4 px-4 text-xs font-medium uppercase tracking-wider" style={{ color: "#3a3a3a" }}>
            <div style={{ width: 36 }} /><div style={{ width: 40 }} />
            <div className="flex-1">Tittel</div>
            <div className="hidden lg:block" style={{ width: 200 }}>Tags</div>
            <div style={{ width: 80, textAlign: "right" }}>Pris</div>
            <div style={{ width: 76 }} />
          </div>
          {recommended.map((s) => {
            const isPackType = s.item_type === "sample-pack" || s.item_type === "preset-pack";
            return isPackType
              ? <SamplePackCard key={s.id} sample={s} isActive={currentBeat?.id === s.id} isPlaying={currentBeat?.id === s.id && isPlaying} onToggle={toggleBeat} onBuy={setCheckoutSample} />
              : <SampleCard key={s.id} sample={s} isActive={currentBeat?.id === s.id} isPlaying={currentBeat?.id === s.id && isPlaying} onToggle={toggleBeat} onBuy={setCheckoutSample} />;
          })}
        </div>
      )}

      {checkoutOpen && (
        <SampleCheckoutModal sample={sample} onClose={() => setCheckoutOpen(false)} />
      )}
      {checkoutSample && (
        <SampleCheckoutModal sample={checkoutSample} onClose={() => setCheckoutSample(null)} />
      )}
    </div>
  );
}
