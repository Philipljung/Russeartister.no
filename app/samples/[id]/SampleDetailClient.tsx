"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Pause, Share2, ChevronLeft, Sliders } from "lucide-react";
import type { Sample } from "@/lib/supabase/types";
import { useToast } from "@/lib/toast-context";
import { CATEGORY_LABELS } from "@/lib/sampleCategories";
import SampleCheckoutModal from "@/components/SampleCheckoutModal";

function genreColor(seed: string): string {
  const palette = ["#1a1040", "#001a2e", "#1a2e00", "#2e1a00", "#001e14", "#14001e", "#1e0a0a", "#00141e"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

// Minimal inline card for recommended samples
function RecommendedSampleCard({
  sample,
  isActive,
  isPlaying,
  onToggle,
  onBuy,
  onNavigate,
}: {
  sample: Sample;
  isActive: boolean;
  isPlaying: boolean;
  onToggle: (s: Sample) => void;
  onBuy: (s: Sample) => void;
  onNavigate: (s: Sample) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const coverImg = sample.cover_url ?? sample.producer?.avatar_url ?? null;
  const coverBg = genreColor(sample.category);
  const canPlay = !!sample.audio_preview_url;
  const isPreset = sample.item_type === "preset";

  return (
    <div
      className="flex items-center gap-2 md:gap-4 rounded-xl px-2 md:px-4 py-3 transition-colors cursor-pointer"
      style={{
        background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
        borderBottom: "1px solid #1a1a1a",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onNavigate(sample)}
    >
      {/* Play button */}
      <button
        onClick={(e) => { e.stopPropagation(); if (canPlay) onToggle(sample); }}
        className="shrink-0 flex items-center justify-center rounded-full transition-colors"
        style={{
          width: 36, height: 36,
          background: isActive ? "#6366f1" : "rgba(255,255,255,0.06)",
          color: isActive ? "#fff" : canPlay ? "#f5f5f7" : "#3a3a3a",
          cursor: canPlay ? "pointer" : "default",
        }}
        title={canPlay ? (isPlaying && isActive ? "Pause" : "Spill av") : "Ingen forhåndsvisning"}
      >
        {isActive && isPlaying
          ? <Pause size={13} fill="currentColor" />
          : !canPlay && isPreset
            ? <Sliders size={13} />
            : <Play size={13} fill="currentColor" />}
      </button>

      {/* Cover */}
      <div
        className="shrink-0 rounded-lg"
        style={{
          width: 40, height: 40,
          backgroundColor: coverBg,
          backgroundImage: coverImg ? `url(${coverImg})` : "none",
          backgroundSize: "cover", backgroundPosition: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}
      />

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-wide" style={{ color: "#f5f5f7" }}>
          {sample.title}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "#86868b" }}>
          {sample.producer?.display_name ?? "Ukjent"}
          {!isPreset && sample.bpm ? ` · ${sample.bpm} BPM` : ""}
        </p>
      </div>

      {/* Price + buy */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: "#f5f5f7", minWidth: 64, textAlign: "right" }}>
          {sample.price === 0 ? "Gratis" : `kr ${sample.price.toLocaleString("nb-NO")}`}
        </span>
        <button
          className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-all"
          style={{
            background: hovered ? "#f5f5f7" : "rgba(255,255,255,0.08)",
            color: hovered ? "#080808" : "#f5f5f7",
            cursor: "pointer",
          }}
          onClick={(e) => { e.stopPropagation(); onBuy(sample); }}
        >
          {sample.price === 0 ? "Last ned" : "Kjøp"}
        </button>
      </div>
    </div>
  );
}

export default function SampleDetailClient({
  sample,
  recommended,
}: {
  sample: Sample;
  recommended: Sample[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const producer = sample.producer;
  const coverImg = sample.cover_url ?? producer?.avatar_url ?? null;
  const coverBg = coverImg ? undefined : genreColor(sample.category);
  const isPreset = sample.item_type === "preset";
  const canPlay = !!sample.audio_preview_url;

  function handleTogglePlay() {
    if (!canPlay) return;

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        void audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    const audio = new Audio(sample.audio_preview_url!);
    audio.onended = () => setIsPlaying(false);
    audioRef.current = audio;
    void audio.play();
    setIsPlaying(true);
  }

  async function handleShare() {
    await navigator.clipboard.writeText(window.location.origin + "/samples/" + sample.id);
    toast("Lenke kopiert!");
  }

  const props: { label: string; value: string }[] = [
    { label: "Kategori", value: CATEGORY_LABELS[sample.category] ?? sample.category },
    ...(sample.bpm && !isPreset ? [{ label: "BPM", value: String(sample.bpm) }] : []),
    ...(sample.key ? [{ label: "Skala", value: sample.key }] : []),
    ...(isPreset && sample.vst ? [{ label: "VST", value: sample.vst }] : []),
  ];

  // Recommended playback state
  const [recPlayingId, setRecPlayingId] = useState<string | null>(null);
  const [recAudioPlaying, setRecAudioPlaying] = useState(false);
  const recAudioRef = useRef<HTMLAudioElement | null>(null);

  function handleRecToggle(s: Sample) {
    if (!s.audio_preview_url) return;

    if (recPlayingId === s.id) {
      if (recAudioRef.current) {
        if (recAudioPlaying) { recAudioRef.current.pause(); setRecAudioPlaying(false); }
        else { void recAudioRef.current.play(); setRecAudioPlaying(true); }
      }
      return;
    }

    recAudioRef.current?.pause();
    const audio = new Audio(s.audio_preview_url);
    audio.onended = () => { setRecPlayingId(null); setRecAudioPlaying(false); };
    recAudioRef.current = audio;
    setRecPlayingId(s.id);
    void audio.play();
    setRecAudioPlaying(true);
  }

  const [checkoutSample, setCheckoutSample] = useState<Sample | null>(null);

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6 py-8">

      {/* Back */}
      <Link
        href="/samples"
        className="mb-6 inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-60"
        style={{ color: "#86868b" }}
      >
        <ChevronLeft size={14} />
        Samples
      </Link>

      {/* Main card */}
      <div
        className="rounded-2xl p-8 mb-4 relative"
        style={{ background: "linear-gradient(135deg, #1e1e1e, #121212)" }}
      >
        {/* Del — top right */}
        <button
          onClick={handleShare}
          className="absolute top-6 right-6 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-opacity hover:opacity-70"
          style={{ color: "#86868b", background: "rgba(255,255,255,0.06)" }}
        >
          <Share2 size={12} />
          Del
        </button>

        {/* Cover + title row */}
        <div className="flex gap-5 items-start">
          {/* Cover with play/preset overlay */}
          <div className="relative shrink-0" style={{ width: 112, height: 112 }}>
            <div
              className="rounded-xl w-full h-full"
              style={{
                backgroundImage: coverImg ? `url(${coverImg})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundColor: coverBg ?? "#2a2a2a",
                boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              }}
            />
            <button
              onClick={handleTogglePlay}
              className="absolute inset-0 flex items-center justify-center rounded-xl transition-all"
              style={{
                background: isPlaying ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)",
                cursor: canPlay ? "pointer" : "default",
              }}
            >
              {isPlaying
                ? <Pause size={20} fill="#f5f5f7" color="#f5f5f7" />
                : !canPlay && isPreset
                  ? <Sliders size={20} color="#f5f5f7" />
                  : <Play size={20} fill="#f5f5f7" color="#f5f5f7" />}
            </button>
          </div>

          {/* Title + producer */}
          <div className="flex-1 min-w-0 pt-1 pr-16">
            <h1
              className="leading-tight mb-2"
              style={{ color: "#f5f5f7", fontWeight: 800, fontSize: 24 }}
            >
              {sample.title}
            </h1>
            <Link
              href={`/profile/${producer?.username ?? ""}`}
              className="text-sm hover:underline"
              style={{ color: "#86868b" }}
            >
              {producer?.display_name ?? "Ukjent"}
            </Link>
          </div>
        </div>

        {/* Description */}
        {sample.description && (
          <p className="mt-6 text-sm leading-relaxed" style={{ color: "#86868b" }}>
            {sample.description}
          </p>
        )}

        {/* Props — pill row */}
        {props.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {props.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <span className="text-xs" style={{ color: "#3a3a3a" }}>{label}</span>
                <div style={{ width: 1, height: 10, background: "#2a2a2a" }} />
                <span className="text-xs font-semibold" style={{ color: "#f5f5f7" }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {sample.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {sample.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-0.5 text-xs"
                style={{ background: "rgba(255,255,255,0.04)", color: "#3a3a3a" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom row: price + buy */}
        <div
          className="flex items-center justify-between mt-8 pt-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: "#3a3a3a" }}>Pris</span>
            <span className="text-xl font-bold" style={{ color: "#f5f5f7" }}>
              {sample.price === 0 ? "Gratis" : `kr ${sample.price.toLocaleString("nb-NO")}`}
            </span>
          </div>
          <button
            onClick={() => setCheckoutOpen(true)}
            className="rounded-full px-6 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#f5f5f7", color: "#080808" }}
          >
            {sample.price === 0 ? "Last ned" : "Kjøp"}
          </button>
        </div>
      </div>

      {/* Recommendations */}
      {recommended.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "#3a3a3a" }}>
            Lignende samples
          </p>
          <div>
            {recommended.map((s) => (
              <RecommendedSampleCard
                key={s.id}
                sample={s}
                isActive={recPlayingId === s.id}
                isPlaying={recPlayingId === s.id && recAudioPlaying}
                onToggle={handleRecToggle}
                onBuy={setCheckoutSample}
                onNavigate={(rec) => router.push(`/samples/${rec.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {checkoutOpen && (
        <SampleCheckoutModal
          sample={sample}
          onClose={() => setCheckoutOpen(false)}
        />
      )}

      {checkoutSample && (
        <SampleCheckoutModal
          sample={checkoutSample}
          onClose={() => setCheckoutSample(null)}
        />
      )}
    </div>
  );
}
