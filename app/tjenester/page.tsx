"use client";

import { useState } from "react";
import { Star, Clock, RefreshCw, CheckCircle2 } from "lucide-react";

type Package = {
  label: string;
  price: number;
  delivery_days: number;
  revisions: number;
};

type Gig = {
  id: string;
  title: string;
  category: string;
  producer: string;
  coverBg: string;
  avg_rating: number;
  review_count: number;
  completed_count: number;
  packages: Package[];
};

const EXAMPLE_GIGS: Gig[] = [
  {
    id: "1",
    title: "Custom russebuss-banger laget fra bunnen",
    category: "produksjon",
    producer: "DJ Ferraristen",
    coverBg: "linear-gradient(135deg, #1a0a2e 0%, #2e1a00 100%)",
    avg_rating: 4.9,
    review_count: 14,
    completed_count: 14,
    packages: [
      { label: "Demo", price: 499, delivery_days: 3, revisions: 0 },
      { label: "Standard", price: 999, delivery_days: 5, revisions: 2 },
      { label: "Full produksjon", price: 1999, delivery_days: 7, revisions: -1 },
    ],
  },
  {
    id: "2",
    title: "Mix & master din russesang profesjonelt",
    category: "mix",
    producer: "MixMaestro",
    coverBg: "linear-gradient(135deg, #14001e 0%, #001e14 100%)",
    avg_rating: 5.0,
    review_count: 5,
    completed_count: 5,
    packages: [
      { label: "Mix", price: 799, delivery_days: 4, revisions: 1 },
      { label: "Mix & Master", price: 1299, delivery_days: 5, revisions: 2 },
    ],
  },
  {
    id: "3",
    title: "Vokal på din låt – profesjonell russ-artist",
    category: "vokal",
    producer: "VokalKongen",
    coverBg: "linear-gradient(135deg, #001a2e 0%, #0a1a00 100%)",
    avg_rating: 4.7,
    review_count: 8,
    completed_count: 8,
    packages: [
      { label: "Hook", price: 399, delivery_days: 3, revisions: 1 },
      { label: "Full sang", price: 899, delivery_days: 5, revisions: 2 },
    ],
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  produksjon: "Produksjon",
  mix: "Mix & Master",
  vokal: "Vokal",
  cover_art: "Cover Art",
  annet: "Annet",
};

const ALL_CATEGORIES = ["produksjon", "mix", "vokal", "cover_art", "annet"];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      <Star size={11} fill="#eab308" color="#eab308" />
      <span className="text-xs font-semibold" style={{ color: "#eab308" }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function GigCard({ gig }: { gig: Gig }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const pkg = gig.packages[selectedIdx];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#111", border: "1px solid #1e1e1e" }}
    >
      {/* Cover */}
      <div className="relative w-full" style={{ height: 180, background: gig.coverBg }}>
        <div
          className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ background: "rgba(0,0,0,0.55)", color: "#f5f5f7", backdropFilter: "blur(8px)" }}
        >
          {CATEGORY_LABELS[gig.category] ?? gig.category}
        </div>
        <div
          className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
          style={{ background: "rgba(0,0,0,0.55)", color: "#86868b", backdropFilter: "blur(8px)" }}
        >
          <CheckCircle2 size={11} style={{ color: "#34d399" }} />
          {gig.completed_count} fullført
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Producer + rating */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
            style={{
              width: 26, height: 26,
              background: "linear-gradient(135deg, #2a1a5e 0%, #1a2a5e 100%)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {gig.producer[0]}
          </div>
          <span className="text-xs font-medium" style={{ color: "#86868b" }}>{gig.producer}</span>
          <div className="ml-auto"><Stars rating={gig.avg_rating} /></div>
        </div>

        {/* Title */}
        <p
          className="text-sm font-semibold leading-snug mb-4"
          style={{
            color: "#f5f5f7",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {gig.title}
        </p>

        {/* Package switcher */}
        {gig.packages.length > 1 && (
          <div className="flex gap-1.5 mb-3">
            {gig.packages.map((p, i) => (
              <button
                key={i}
                onClick={() => setSelectedIdx(i)}
                className="flex-1 rounded-lg py-1.5 text-xs font-medium transition-all"
                style={{
                  background: selectedIdx === i ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${selectedIdx === i ? "rgba(99,102,241,0.35)" : "#2a2a2a"}`,
                  color: selectedIdx === i ? "#818cf8" : "#3a3a3a",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Package details */}
        <div className="flex items-center gap-3 mb-4 text-xs" style={{ color: "#3a3a3a" }}>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {pkg.delivery_days} dager
          </span>
          <span className="flex items-center gap-1">
            <RefreshCw size={11} />
            {pkg.revisions === -1 ? "Ubegrenset rev." : pkg.revisions === 0 ? "Ingen rev." : `${pkg.revisions} rev.`}
          </span>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid #1e1e1e" }}>
          <div>
            <p className="text-xs" style={{ color: "#3a3a3a" }}>Fra</p>
            <p className="text-base font-bold" style={{ color: "#f5f5f7" }}>
              kr {pkg.price.toLocaleString("nb-NO")}
            </p>
          </div>
          <button
            className="rounded-xl px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: "#f5f5f7", color: "#080808" }}
          >
            Bestill
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TjenesterPage() {
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");

  const filtered = EXAMPLE_GIGS.filter((g) => {
    const matchCat = !activeCategory || g.category === activeCategory;
    const matchSearch = !search ||
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.producer.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      {/* Filter bar */}
      <div
        className="sticky top-14 z-40 border-b"
        style={{
          background: "rgba(8,8,8,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "#1e1e1e",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex items-center gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Søk etter tjeneste eller artist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl px-3 py-1.5 text-xs outline-none"
            style={{
              background: "#141414",
              border: "1px solid #2a2a2a",
              color: "#f5f5f7",
              width: 220,
            }}
          />

          {/* Category filters */}
          <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => setActiveCategory("")}
              className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: !activeCategory ? "rgba(99,102,241,0.12)" : "transparent",
                border: `1px solid ${!activeCategory ? "rgba(99,102,241,0.35)" : "#2a2a2a"}`,
                color: !activeCategory ? "#818cf8" : "#3a3a3a",
              }}
            >
              Alle
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? "" : cat)}
                className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap"
                style={{
                  background: activeCategory === cat ? "rgba(99,102,241,0.12)" : "transparent",
                  border: `1px solid ${activeCategory === cat ? "rgba(99,102,241,0.35)" : "#2a2a2a"}`,
                  color: activeCategory === cat ? "#818cf8" : "#3a3a3a",
                }}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#f5f5f7" }}>Tjenester</h1>
            <p className="mt-1 text-sm" style={{ color: "#3a3a3a" }}>Bestill custom innhold direkte fra artistene</p>
          </div>
          <p className="text-sm" style={{ color: "#86868b" }}>
            {filtered.length} {filtered.length === 1 ? "tjeneste" : "tjenester"}
          </p>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-20 text-center text-sm" style={{ color: "#3a3a3a" }}>Ingen tjenester funnet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((gig) => <GigCard key={gig.id} gig={gig} />)}
          </div>
        )}
      </div>
    </>
  );
}
