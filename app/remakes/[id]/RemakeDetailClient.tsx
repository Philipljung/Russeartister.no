"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Pause, Share2, ChevronLeft } from "lucide-react";
import type { Remake } from "@/lib/supabase/types";
import { useToast } from "@/lib/toast-context";
import RemakeCheckoutModal from "@/components/RemakeCheckoutModal";
import RemakeCard from "@/components/RemakeCard";

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
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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

  function handleTogglePlay() {
    if (!remake.audio_preview_url) return;

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

    const audio = new Audio(remake.audio_preview_url);
    audio.onended = () => setIsPlaying(false);
    audioRef.current = audio;
    void audio.play();
    setIsPlaying(true);
  }

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

  // Recommended playback state
  const [recPlayingId, setRecPlayingId] = useState<string | null>(null);
  const [recAudioPlaying, setRecAudioPlaying] = useState(false);
  const recAudioRef = useRef<HTMLAudioElement | null>(null);

  function handleRecToggle(r: Remake) {
    if (!r.audio_preview_url) return;

    if (recPlayingId === r.id) {
      if (recAudioRef.current) {
        if (recAudioPlaying) { recAudioRef.current.pause(); setRecAudioPlaying(false); }
        else { void recAudioRef.current.play(); setRecAudioPlaying(true); }
      }
      return;
    }

    recAudioRef.current?.pause();
    const audio = new Audio(r.audio_preview_url);
    audio.onended = () => { setRecPlayingId(null); setRecAudioPlaying(false); };
    recAudioRef.current = audio;
    setRecPlayingId(r.id);
    void audio.play();
    setRecAudioPlaying(true);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6 py-8">

      {/* Back */}
      <Link
        href="/remakes"
        className="mb-6 inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-60"
        style={{ color: "#86868b" }}
      >
        <ChevronLeft size={14} />
        Remakes
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
          {/* Cover with play overlay */}
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
                cursor: remake.audio_preview_url ? "pointer" : "default",
              }}
            >
              {isPlaying
                ? <Pause size={20} fill="#f5f5f7" color="#f5f5f7" />
                : <Play size={20} fill="#f5f5f7" color="#f5f5f7" />}
            </button>
          </div>

          {/* Title + producer */}
          <div className="flex-1 min-w-0 pt-1 pr-16">
            <h1
              className="leading-tight mb-1"
              style={{ color: "#f5f5f7", fontWeight: 800, fontSize: 24 }}
            >
              {remake.title}
            </h1>
            <Link
              href={`/profile/${encodeURIComponent((producer?.display_name ?? producer?.username ?? "").trim())}`}
              className="text-sm hover:underline"
              style={{ color: "#86868b" }}
            >
              {producer?.display_name ?? "Ukjent"}
            </Link>
          </div>
        </div>

        {/* Description */}
        {remake.description && (
          <p className="mt-6 text-sm leading-relaxed whitespace-pre-line" style={{ color: "#86868b" }}>
            {remake.description}
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

        {/* VSTs — green pills */}
        {remake.vsts && remake.vsts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {remake.vsts.map((vst) => (
              <span
                key={vst}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}
              >
                {vst}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {remake.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {remake.tags.map((tag) => (
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
              {remake.price === 0 ? "Gratis" : `kr ${remake.price.toLocaleString("nb-NO")}`}
            </span>
          </div>
          <button
            onClick={remake.price === 0 ? handleFreeDownload : () => setCheckoutOpen(true)}
            className="rounded-full px-6 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#f5f5f7", color: "#080808" }}
          >
            {remake.price === 0 ? "Last ned" : "Kjøp"}
          </button>
        </div>
      </div>

      {/* Recommendations */}
      {recommended.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "#3a3a3a" }}>
            Lignende remakes
          </p>
          <div>
            {recommended.map((r) => (
              <RemakeCard
                key={r.id}
                remake={r}
                isActive={recPlayingId === r.id}
                isPlaying={recPlayingId === r.id && recAudioPlaying}
                onToggle={handleRecToggle}
                onBuy={(rec) => { router.push(`/remakes/${rec.id}`); }}
              />
            ))}
          </div>
        </div>
      )}

      {checkoutOpen && (
        <RemakeCheckoutModal
          remake={remake}
          onClose={() => setCheckoutOpen(false)}
        />
      )}

    </div>
  );
}
