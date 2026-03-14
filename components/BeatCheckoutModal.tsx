"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X, Music, Crown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseClient } from "@/lib/supabase/client";
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
  const [isMobile, setIsMobile] = useState(false);

  // Exclusive licensing
  const [exclusiveEligible, setExclusiveEligible] = useState(false);
  const [exclusiveSelected, setExclusiveSelected] = useState(false);
  const [saleCount, setSaleCount] = useState<number | null>(null);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch purchase count (always) + check exclusive eligibility
  useEffect(() => {
    getSupabaseClient()
      .rpc("beat_purchase_count", { beat_id: beat.id })
      .then(({ data }: { data: number | null }) => {
        const count = data ?? 0;
        setSaleCount(count);
        if (beat.exclusive_price && !beat.exclusively_sold && count === 0) {
          setExclusiveEligible(true);
        }
      });
  }, [beat.id, beat.exclusive_price, beat.exclusively_sold]);

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
    console.log("[BeatCheckoutModal] Fetching client secret for beat:", beat.id, "exclusive:", exclusiveSelected);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beatId: beat.id, exclusive: exclusiveSelected }),
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
  }, [beat.id, exclusiveSelected]);

  const coverImg = beat.cover_url ?? beat.producer?.avatar_url ?? null;
  const coverBg = genreColor(beat.genre);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={
          isMobile
            ? "relative flex w-full flex-col overflow-hidden"
            : "relative flex w-full max-w-4xl overflow-hidden rounded-2xl"
        }
        style={{
          background: "#111",
          border: isMobile ? "none" : "1px solid #2a2a2a",
          maxHeight: isMobile ? "100dvh" : "90vh",
          height: isMobile ? "100dvh" : "auto",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          borderRadius: isMobile ? 0 : undefined,
          flexDirection: isMobile ? "column" : "row",
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

        {/* Beat details panel */}
        <div
          style={
            isMobile
              ? {
                  background: "#0c0c0c",
                  borderBottom: "1px solid #1e1e1e",
                  padding: "20px 16px",
                  flexShrink: 0,
                }
              : {
                  width: 300,
                  background: "#0c0c0c",
                  borderRight: "1px solid #1e1e1e",
                  padding: "32px 24px",
                  flexShrink: 0,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                }
          }
        >
          {isMobile ? (
            /* Mobile: compact horizontal layout */
            <div className="flex items-center gap-3 pr-10">
              {/* Cover thumbnail */}
              <div
                className="shrink-0 rounded-xl overflow-hidden"
                style={{ width: 56, height: 56, backgroundColor: coverBg }}
              >
                {coverImg ? (
                  <Image
                    src={coverImg}
                    alt={beat.title}
                    width={56}
                    height={56}
                    style={{ objectFit: "cover", width: 56, height: 56 }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music size={24} style={{ color: "rgba(255,255,255,0.2)" }} />
                  </div>
                )}
              </div>
              {/* Title + meta */}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold tracking-tight" style={{ color: "#f5f5f7" }}>
                  {beat.title}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "#86868b" }}>
                  {beat.producer?.display_name ?? "Ukjent produsent"} &middot; {beat.genre} &middot; {beat.bpm} BPM
                </p>
                <p className="text-sm font-bold mt-1" style={{ color: "#f5f5f7" }}>
                  kr {beat.price.toLocaleString("nb-NO")}
                </p>
              </div>
            </div>
          ) : (
            /* Desktop: full vertical layout */
            <>
              {/* Cover */}
              <div
                className="relative mb-5 w-full overflow-hidden rounded-xl"
                style={{ aspectRatio: "1 / 1", backgroundColor: coverBg }}
              >
                {coverImg ? (
                  <Image
                    src={coverImg}
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
                  <p className="mb-0.5 text-xs" style={{ color: "#3a3a3a" }}>Skala</p>
                  <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>{beat.key}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs" style={{ color: "#3a3a3a" }}>Antall salg</p>
                  <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>
                    {saleCount === null ? "—" : saleCount}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="mb-0.5 text-xs" style={{ color: "#3a3a3a" }}>Prosjektfil inkludert</p>
                  <p className="text-sm font-medium" style={{ color: beat.project_file_url ? "#34c759" : "#86868b" }}>
                    {beat.project_file_url ? "Ja" : "Nei"}
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

              {/* Exclusive licensing option */}
              {exclusiveEligible && (
                <div
                  className="mb-5 rounded-xl p-4"
                  style={{
                    background: exclusiveSelected ? "rgba(234,179,8,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${exclusiveSelected ? "rgba(234,179,8,0.35)" : "#2a2a2a"}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Crown size={15} style={{ color: exclusiveSelected ? "#eab308" : "#86868b", flexShrink: 0, marginTop: 2 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold mb-1" style={{ color: "#f5f5f7" }}>
                        Ingen har kjøpt denne låten før deg
                      </p>
                      <p className="text-xs leading-relaxed mb-3" style={{ color: "#86868b" }}>
                        Du kan gjøre den eksklusiv for{" "}
                        <span style={{ color: "#f5f5f7", fontWeight: 600 }}>
                          kr {beat.exclusive_price!.toLocaleString("nb-NO")}
                        </span>
                        . Da eier du den alene — beatet fjernes fra salg og ingen andre kan noen gang kjøpe det.
                      </p>
                      <button
                        onClick={() => setExclusiveSelected(!exclusiveSelected)}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                        style={{
                          background: exclusiveSelected ? "#eab308" : "rgba(255,255,255,0.08)",
                          color: exclusiveSelected ? "#000" : "#f5f5f7",
                        }}
                      >
                        <Crown size={12} />
                        {exclusiveSelected ? "Eksklusiv valgt" : "Gjør eksklusiv"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="mt-auto">
                <p className="text-xs mb-1" style={{ color: "#3a3a3a" }}>
                  {exclusiveSelected ? "Eksklusiv pris" : "Pris"}
                </p>
                <p className="text-3xl font-bold" style={{ color: exclusiveSelected ? "#eab308" : "#f5f5f7" }}>
                  kr {(exclusiveSelected ? beat.exclusive_price! : beat.price).toLocaleString("nb-NO")}
                </p>
                {exclusiveSelected && (
                  <p className="mt-0.5 text-xs" style={{ color: "#86868b" }}>
                    Vanlig pris: kr {beat.price.toLocaleString("nb-NO")}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Stripe checkout panel */}
        <div
          className="flex flex-col overflow-y-auto"
          style={
            isMobile
              ? { flex: 1, padding: "16px 16px 24px" }
              : { flex: 1, padding: "32px 24px" }
          }
        >
          <h3 className="mb-4 md:mb-6 text-base md:text-lg font-semibold" style={{ color: "#f5f5f7" }}>
            Betal
          </h3>
          <EmbeddedCheckoutProvider
            key={String(exclusiveSelected)}
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
