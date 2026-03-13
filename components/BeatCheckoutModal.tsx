"use client";

import { useEffect, useCallback, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X, Music } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Beat } from "@/lib/supabase/types";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function genreColor(genre: string): string {
  const palette = [
    "#1a1040", "#001a2e", "#1a2e00", "#2e1a00",
    "#001e14", "#14001e", "#1e0a0a", "#00141e",
  ];
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

type Props = {
  beat: Beat;
  onClose: () => void;
};

export default function BeatCheckoutModal({ beat, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const fetchClientSecret = useCallback(async () => {
    console.log("[BeatCheckoutModal] Fetching client secret for beat:", beat.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beatId: beat.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        console.error("[BeatCheckoutModal] Failed to get client secret:", data.error);
        return "";
      }
      console.log("[BeatCheckoutModal] Got client secret");
      return data.clientSecret as string;
    } catch (err) {
      console.error("[BeatCheckoutModal] Unexpected error:", err);
      return "";
    }
  }, [beat.id]);

  const coverBg = genreColor(beat.genre);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="relative flex w-full max-w-4xl overflow-hidden rounded-2xl"
        style={{
          background: "#111",
          border: "1px solid #2a2a2a",
          maxHeight: "90vh",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{
            width: 32,
            height: 32,
            background: "rgba(255,255,255,0.08)",
            color: "#f5f5f7",
          }}
        >
          <X size={15} />
        </button>

        {/* Left — beat details */}
        <div
          className="flex shrink-0 flex-col overflow-y-auto"
          style={{
            width: 300,
            background: "#0c0c0c",
            borderRight: "1px solid #1e1e1e",
            padding: "32px 24px",
          }}
        >
          {/* Cover */}
          <div
            className="relative mb-5 w-full overflow-hidden rounded-xl"
            style={{ aspectRatio: "1 / 1", backgroundColor: coverBg }}
          >
            {beat.cover_url ? (
              <Image
                src={beat.cover_url}
                alt={beat.title}
                fill
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Music size={48} style={{ color: "rgba(255,255,255,0.2)" }} />
              </div>
            )}
          </div>

          {/* Title */}
          <h2
            className="mb-1 text-xl font-bold tracking-tight"
            style={{ color: "#f5f5f7" }}
          >
            {beat.title}
          </h2>

          {/* Producer */}
          <Link
            href={`/profile/${beat.producer?.username ?? ""}`}
            onClick={onClose}
            className="mb-5 text-sm hover:underline"
            style={{ color: "#86868b" }}
          >
            {beat.producer?.display_name ?? "Ukjent produsent"}
          </Link>

          {/* Metadata grid */}
          <div
            className="mb-5 grid grid-cols-2 gap-3 rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e1e1e" }}
          >
            <div>
              <p className="mb-0.5 text-xs" style={{ color: "#3a3a3a" }}>Sjanger</p>
              <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>{beat.genre}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs" style={{ color: "#3a3a3a" }}>BPM</p>
              <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>{beat.bpm}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs" style={{ color: "#3a3a3a" }}>Toneart</p>
              <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>{beat.key}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs" style={{ color: "#3a3a3a" }}>Format</p>
              <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>
                {beat.project_file_url ? "WAV + MIDI" : "WAV"}
              </p>
            </div>
          </div>

          {/* Tags */}
          {beat.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              {beat.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-1 text-xs"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {beat.description && (
            <p className="mb-5 text-sm leading-relaxed" style={{ color: "#86868b" }}>
              {beat.description}
            </p>
          )}

          {/* Price */}
          <div className="mt-auto">
            <p className="text-xs mb-1" style={{ color: "#3a3a3a" }}>Pris</p>
            <p className="text-3xl font-bold" style={{ color: "#f5f5f7" }}>
              kr {beat.price.toLocaleString("nb-NO")}
            </p>
          </div>
        </div>

        {/* Right — embedded Stripe checkout */}
        <div className="flex flex-1 flex-col overflow-y-auto" style={{ padding: "32px 24px" }}>
          <h3 className="mb-6 text-lg font-semibold" style={{ color: "#f5f5f7" }}>
            Betal
          </h3>
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}
