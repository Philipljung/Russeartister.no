"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Play, Pause, Share2, Music, Package, X, Lock } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Pack, PackItem } from "@/lib/supabase/types";
import { useToast } from "@/lib/toast-context";
import { slugifyName } from "@/lib/slugify";
import { usePlayer } from "@/lib/player-context";

type Tab = "alle" | "samples" | "presets";

export default function PackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const packId = params.id as string;

  const { currentBeat, isPlaying: playerIsPlaying, toggleBeat } = usePlayer();

  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("alle");
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase
      .from("packs")
      .select("*, producer:profiles(*), pack_items(*)")
      .eq("id", packId)
      .single()
      .then(({ data, error }: { data: Pack | null; error: unknown }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        if (data.pack_items) {
          data.pack_items.sort((a: PackItem, b: PackItem) => a.position - b.position);
        }
        setPack(data as Pack);
        setLoading(false);
      });
  }, [packId]);

  function togglePackPreview() {
    if (!pack?.preview_url) return;
    toggleBeat({
      id: `pack-${pack.id}`,
      title: pack.title,
      audio_preview_url: pack.preview_url,
      cover_url: pack.cover_url ?? null,
      genre: null,
      bpm: null,
      key: null,
      producer: pack.producer ?? undefined,
    });
  }

  function togglePlay(item: PackItem) {
    if (!item.audio_url) return;
    if (item.item_type === "sample" && !item.is_preview) return;
    toggleBeat({
      id: item.id,
      title: item.name,
      audio_preview_url: item.audio_url,
      cover_url: pack?.cover_url ?? null,
      genre: null,
      bpm: item.bpm ?? null,
      key: item.key ?? null,
      producer: pack?.producer ?? undefined,
    });
  }

  function shareLink() {
    void navigator.clipboard.writeText(window.location.href);
    toast("Lenke kopiert!");
  }

  async function handleFreeDownload() {
    const res = await fetch(`/api/free-download?type=pack&id=${packId}`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else toast("Nedlasting feilet. Prøv igjen.");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "#3a3a3a" }}>Laster pakke...</p>
      </div>
    );
  }

  if (notFound || !pack) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold" style={{ color: "#f5f5f7" }}>Pakke ikke funnet</p>
        <Link href="/samples?tab=pack" className="mt-4 rounded-xl px-5 py-2 text-sm font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "#f5f5f7" }}>
          Gå til pakker
        </Link>
      </div>
    );
  }

  const items = pack.pack_items ?? [];
  const sampleItems = items.filter((i) => i.item_type === "sample");
  const presetItems = items.filter((i) => i.item_type === "preset");
  const displayItems = activeTab === "samples" ? sampleItems : activeTab === "presets" ? presetItems : items;

  const coverImg = pack.cover_url ?? pack.producer?.avatar_url ?? null;
  const hasPackPreview = !!pack.preview_url;
  const packIsPlaying = currentBeat?.id === `pack-${pack.id}` && playerIsPlaying;

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6 pt-6 pb-20">
      {/* Back */}
      <Link href="/samples?tab=pack" className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70" style={{ color: "#86868b" }}>
        <ChevronLeft size={16} /> Tilbake
      </Link>

      {/* Hero */}
      <div className="flex gap-5 md:gap-8 items-start mb-8">
        {/* Cover with optional play overlay */}
        <div
          className="shrink-0 rounded-2xl overflow-hidden relative group"
          style={{ width: 160, height: 160, background: "#141414", border: "1px solid #1e1e1e", cursor: hasPackPreview ? "pointer" : "default" }}
          onClick={hasPackPreview ? togglePackPreview : undefined}
        >
          {coverImg ? (
            <Image src={coverImg} alt={pack.title} width={160} height={160} className="object-cover w-full h-full" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-3xl font-bold" style={{ color: "#1e1e1e" }}>{pack.title.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          {/* Play overlay on cover — only shown when pack has an explicit preview_url */}
          {hasPackPreview && (
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity"
              style={{
                background: packIsPlaying ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.3)",
                opacity: packIsPlaying ? 1 : 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
              onMouseLeave={(e) => { if (!packIsPlaying) (e.currentTarget as HTMLDivElement).style.opacity = "0"; }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 48, height: 48, background: "rgba(255,255,255,0.9)", color: "#080808" }}
              >
                {packIsPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 3 }} />}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${slugifyName(pack.producer?.display_name ?? "")}`}
            className="text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: "#86868b" }}
          >
            {pack.producer?.display_name ?? "Ukjent"}
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 mb-2" style={{ color: "#f5f5f7" }}>{pack.title}</h1>

          {/* Stats */}
          <div className="flex items-center gap-3 mb-4">
            {sampleItems.length > 0 && <span className="text-xs" style={{ color: "#86868b" }}>{sampleItems.length} Samples</span>}
            {presetItems.length > 0 && <span className="text-xs" style={{ color: "#86868b" }}>{presetItems.length} Presets</span>}
            <span className="text-xs" style={{ color: "#3a3a3a" }}>{items.length} totalt</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {pack.price === 0 ? (
              <button
                onClick={handleFreeDownload}
                className="rounded-xl px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#f5f5f7", color: "#080808" }}
              >
                Last ned gratis
              </button>
            ) : (
              <button
                onClick={() => setShowCheckout(true)}
                className="rounded-xl px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#f5f5f7", color: "#080808" }}
              >
                Kjøp — {pack.price} kr
              </button>
            )}
            <button
              onClick={shareLink}
              className="rounded-lg p-2 transition-opacity hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      {pack.description && (
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#86868b" }}>{pack.description}</p>
      )}

      {/* Tags */}
      {pack.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {pack.tags.map((tag) => (
            <span key={tag} className="rounded-full px-2.5 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}>{tag}</span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0 mb-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
        {(["alle", "samples", "presets"] as Tab[]).map((tab) => {
          const count = tab === "alle" ? items.length : tab === "samples" ? sampleItems.length : presetItems.length;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 text-sm font-medium transition-colors"
              style={{
                color: isActive ? "#f5f5f7" : "#86868b",
                borderBottom: isActive ? "2px solid #f5f5f7" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {tab === "alle" ? "Alle" : tab === "samples" ? "Samples" : "Presets"} ({count})
            </button>
          );
        })}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 text-xs" style={{ color: "#3a3a3a" }}>
        <div style={{ width: 36 }} />
        <div className="flex-1 min-w-0">Navn</div>
        <div className="hidden md:block" style={{ width: 80 }}>Type</div>
        <div className="hidden md:block" style={{ width: 80 }}>BPM</div>
        <div className="hidden md:block" style={{ width: 80 }}>Skala</div>
        <div className="hidden md:block" style={{ width: 100 }}>Tags</div>
      </div>

      {/* Items */}
      {displayItems.length === 0 ? (
        <p className="text-sm py-12 text-center" style={{ color: "#3a3a3a" }}>
          Ingen {activeTab === "samples" ? "samples" : activeTab === "presets" ? "presets" : "items"} i denne pakken.
        </p>
      ) : (
        displayItems.map((item) => (
          <PackItemRow
            key={item.id}
            item={item}
            isActive={currentBeat?.id === item.id}
            isPlaying={currentBeat?.id === item.id && playerIsPlaying}
            onToggle={() => togglePlay(item)}
          />
        ))
      )}

      {/* Checkout modal */}
      {showCheckout && pack && (
        <PackCheckoutModal pack={pack} onClose={() => setShowCheckout(false)} />
      )}
    </div>
  );
}

// ── Item Row ──────────────────────────────────────────────────────────────────
function PackItemRow({
  item,
  isActive,
  isPlaying,
  onToggle,
}: {
  item: PackItem;
  isActive: boolean;
  isPlaying: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isSample = item.item_type === "sample";
  const isPreset = item.item_type === "preset";
  const canPlay = isSample && item.is_preview && !!item.audio_url;
  const isLocked = isSample && !item.is_preview;
  const typeLabel = isSample ? (item.sub_type === "loop" ? "Loop" : "One-shot") : `Preset${item.vst ? ` · ${item.vst}` : ""}`;

  return (
    <div
      className="flex items-center gap-2 md:gap-4 rounded-xl px-2 md:px-4 py-3 transition-colors"
      style={{
        background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
        borderBottom: "1px solid #1a1a1a",
        cursor: canPlay ? "pointer" : "default",
        opacity: isLocked ? 0.5 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => canPlay && onToggle()}
    >
      {/* Play button / Lock icon */}
      {isLocked ? (
        <div
          className="shrink-0 flex items-center justify-center rounded-full"
          style={{ width: 36, height: 36, background: "rgba(255,255,255,0.03)", color: "#3a3a3a" }}
        >
          <Lock size={14} />
        </div>
      ) : isSample ? (
        <button
          onClick={(e) => { e.stopPropagation(); if (canPlay) onToggle(); }}
          className="shrink-0 flex items-center justify-center rounded-full transition-colors"
          style={{
            width: 36, height: 36,
            background: isActive && isPlaying ? "#f5f5f7" : "rgba(255,255,255,0.06)",
            color: isActive && isPlaying ? "#080808" : canPlay ? "#f5f5f7" : "#3a3a3a",
            cursor: canPlay ? "pointer" : "default",
          }}
        >
          {isActive && isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
        </button>
      ) : (
        <div
          className="shrink-0 flex items-center justify-center rounded-full"
          style={{ width: 36, height: 36, background: "rgba(255,255,255,0.06)", color: "#86868b" }}
        >
          <Package size={14} />
        </div>
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: isLocked ? "#86868b" : "#f5f5f7" }}>{item.name}</p>
        <p className="text-xs truncate md:hidden" style={{ color: "#3a3a3a" }}>
          {typeLabel}
          {item.bpm ? ` · ${item.bpm} BPM` : ""}
          {item.key ? ` · ${item.key}` : ""}
        </p>
      </div>

      {/* Type */}
      <div className="hidden md:flex items-center gap-1.5" style={{ width: 80 }}>
        {isSample ? <Music size={12} style={{ color: "#86868b" }} /> : <Package size={12} style={{ color: "#86868b" }} />}
        <span className="text-xs" style={{ color: "#86868b" }}>{typeLabel}</span>
      </div>

      {/* BPM */}
      <div className="hidden md:block text-xs" style={{ width: 80, color: item.bpm ? "#86868b" : "#2a2a2a" }}>
        {item.bpm ?? "--"}
      </div>

      {/* Key */}
      <div className="hidden md:block text-xs" style={{ width: 80, color: item.key ? "#86868b" : "#2a2a2a" }}>
        {item.key ?? "--"}
      </div>

      {/* Tags */}
      <div className="hidden md:flex items-center gap-1" style={{ width: 100 }}>
        {item.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded-full px-2 py-0.5 text-xs truncate" style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

// ── Checkout Modal ──────────────────────────────────────────────────────────
function PackCheckoutModal({ pack, onClose }: { pack: Pack; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stripe/checkout-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId: pack.id }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else setError(data.error ?? "Noe gikk galt");
        setLoading(false);
      })
      .catch(() => { setError("Noe gikk galt"); setLoading(false); });
  }, [pack.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative rounded-2xl w-full max-w-lg mx-4 p-6" style={{ background: "#141414", border: "1px solid #2a2a2a" }}>
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: "#86868b" }}>
          <X size={18} />
        </button>

        <h2 className="text-lg font-bold mb-1" style={{ color: "#f5f5f7" }}>{pack.title}</h2>
        <p className="text-sm mb-4" style={{ color: "#86868b" }}>{pack.price} kr</p>

        {loading && <p className="text-sm py-8 text-center" style={{ color: "#3a3a3a" }}>Laster betalingsside...</p>}
        {error && <p className="text-sm py-8 text-center" style={{ color: "#ff453a" }}>{error}</p>}

        {clientSecret && (
          <StripeEmbed clientSecret={clientSecret} />
        )}
      </div>
    </div>
  );
}

function StripeEmbed({ clientSecret }: { clientSecret: string }) {
  const [StripeComponents, setStripeComponents] = useState<{
    EmbeddedCheckoutProvider: typeof import("@stripe/react-stripe-js").EmbeddedCheckoutProvider;
    EmbeddedCheckout: typeof import("@stripe/react-stripe-js").EmbeddedCheckout;
  } | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof import("@stripe/stripe-js").loadStripe> | null>(null);

  useEffect(() => {
    Promise.all([
      import("@stripe/react-stripe-js"),
      import("@stripe/stripe-js"),
    ]).then(([react, stripe]) => {
      setStripeComponents({ EmbeddedCheckoutProvider: react.EmbeddedCheckoutProvider, EmbeddedCheckout: react.EmbeddedCheckout });
      setStripePromise(stripe.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!));
    });
  }, []);

  if (!StripeComponents || !stripePromise) {
    return <p className="text-sm py-8 text-center" style={{ color: "#3a3a3a" }}>Laster...</p>;
  }

  return (
    <StripeComponents.EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
      <StripeComponents.EmbeddedCheckout />
    </StripeComponents.EmbeddedCheckoutProvider>
  );
}
