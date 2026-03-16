"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { X, Music } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Remake } from "@/lib/supabase/types";

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
  remake: Remake;
  onClose: () => void;
};

export default function RemakeCheckoutModal({ remake, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth < 768); }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const fetchClientSecret = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/checkout-remake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remakeId: remake.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) return "";
      return data.clientSecret as string;
    } catch {
      return "";
    }
  }, [remake.id]);

  const coverImg = remake.cover_url ?? remake.producer?.avatar_url ?? null;
  const coverBg = genreColor(remake.genre ?? remake.title);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={isMobile ? "relative flex w-full flex-col overflow-hidden" : "relative flex w-full max-w-4xl overflow-hidden rounded-2xl"}
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
          style={{ width: 32, height: 32, background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}
        >
          <X size={15} />
        </button>

        {/* Remake details panel */}
        <div
          style={
            isMobile
              ? { background: "#0c0c0c", borderBottom: "1px solid #1e1e1e", padding: "20px 16px", flexShrink: 0 }
              : { width: 300, background: "#0c0c0c", borderRight: "1px solid #1e1e1e", padding: "32px 24px", flexShrink: 0, overflowY: "auto", display: "flex", flexDirection: "column" }
          }
        >
          {isMobile ? (
            <div className="flex items-center gap-3 pr-10">
              <div className="shrink-0 rounded-xl overflow-hidden" style={{ width: 56, height: 56, backgroundColor: coverBg }}>
                {coverImg ? (
                  <Image src={coverImg} alt={remake.title} width={56} height={56} style={{ objectFit: "cover", width: 56, height: 56 }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music size={24} style={{ color: "rgba(255,255,255,0.2)" }} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold tracking-tight" style={{ color: "#f5f5f7" }}>{remake.title}</h2>
                <p className="text-xs mt-0.5" style={{ color: "#86868b" }}>
                  {remake.producer?.display_name ?? "Ukjent"} &middot; remake av {remake.original_song}
                </p>
                <p className="text-sm font-bold mt-1" style={{ color: "#f5f5f7" }}>kr {remake.price.toLocaleString("nb-NO")}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Cover */}
              <div className="relative mb-5 w-full overflow-hidden rounded-xl" style={{ aspectRatio: "1 / 1", backgroundColor: coverBg }}>
                {coverImg ? (
                  <Image src={coverImg} alt={remake.title} fill style={{ objectFit: "cover" }} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music size={48} style={{ color: "rgba(255,255,255,0.2)" }} />
                  </div>
                )}
              </div>

              <h2 className="mb-1 text-xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>{remake.title}</h2>
              <p className="mb-1 text-sm" style={{ color: "#86868b" }}>Remake av <span style={{ color: "#f5f5f7" }}>{remake.original_song}</span></p>

              <Link
                href={`/profile/${remake.producer?.username ?? ""}`}
                onClick={onClose}
                className="mb-5 text-sm hover:underline"
                style={{ color: "#86868b" }}
              >
                {remake.producer?.display_name ?? "Ukjent produsent"}
              </Link>

              {/* Metadata grid */}
              <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e1e1e" }}>
                <div>
                  <p className="mb-0.5 text-xs" style={{ color: "#3a3a3a" }}>Sjanger</p>
                  <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>{remake.genre}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs" style={{ color: "#3a3a3a" }}>BPM</p>
                  <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>{remake.bpm}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs" style={{ color: "#3a3a3a" }}>Skala</p>
                  <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>{remake.key}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs" style={{ color: "#3a3a3a" }}>Inkludert</p>
                  <p className="text-sm font-medium" style={{ color: "#34c759" }}>Prosjektfil (.zip)</p>
                </div>
              </div>

              {/* Tags */}
              {remake.tags.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {remake.tags.map((tag) => (
                    <span key={tag} className="rounded-full px-2.5 py-1 text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {remake.description && (
                <p className="mb-5 text-sm leading-relaxed" style={{ color: "#86868b" }}>{remake.description}</p>
              )}

              <div className="mt-auto">
                <p className="text-xs mb-1" style={{ color: "#3a3a3a" }}>Pris</p>
                <p className="text-3xl font-bold" style={{ color: "#f5f5f7" }}>kr {remake.price.toLocaleString("nb-NO")}</p>
              </div>
            </>
          )}
        </div>

        {/* Stripe checkout panel */}
        <div
          className="flex flex-col overflow-y-auto"
          style={isMobile ? { flex: 1, padding: "16px 16px 24px" } : { flex: 1, padding: "32px 24px" }}
        >
          <h3 className="mb-4 md:mb-6 text-base md:text-lg font-semibold" style={{ color: "#f5f5f7" }}>Betal</h3>
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}
