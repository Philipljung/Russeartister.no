"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchHeroSlides, type HeroSlide } from "@/lib/fetchCms";

const FALLBACK: HeroSlide[] = [
  {
    id: "1", display_order: 0, tag: "Velkommen",
    headline: "Norges største plattform for kjøp og salg av russelåter",
    subtitle: "Kjøp sanger, samples, presets & remakes",
    picture_url: null, cta_text: null, cta_url: null, is_clickable: false,
    bg_gradient: "linear-gradient(135deg, #0f0a2a 0%, #1a0d3a 40%, #0d1a40 100%)",
  },
  {
    id: "2", display_order: 1, tag: "Produsenter",
    headline: "Selg låtene dine og tjen penger på musikken din",
    subtitle: "Last opp, sett pris, og nå tusenvis av russ over hele landet",
    picture_url: null, cta_text: null, cta_url: null, is_clickable: false,
    bg_gradient: "linear-gradient(135deg, #001a0f 0%, #002a1a 40%, #001430 100%)",
  },
  {
    id: "3", display_order: 2, tag: "Nytt",
    headline: "Bli med i Communityet!",
    subtitle: "Bli med i en gruppe med over 2000 medlemmer!",
    picture_url: null, cta_text: null, cta_url: null, is_clickable: false,
    bg_gradient: "linear-gradient(135deg, #1a0a00 0%, #2a1000 40%, #1a0a20 100%)",
  },
];

const ACCENT: Record<number, string> = {
  0: "radial-gradient(ellipse at 20% 60%, rgba(99,102,241,0.25) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(139,92,246,0.15) 0%, transparent 50%)",
  1: "radial-gradient(ellipse at 70% 40%, rgba(52,199,89,0.2) 0%, transparent 60%), radial-gradient(ellipse at 20% 70%, rgba(0,200,120,0.1) 0%, transparent 50%)",
  2: "radial-gradient(ellipse at 30% 50%, rgba(255,149,0,0.18) 0%, transparent 60%), radial-gradient(ellipse at 75% 25%, rgba(255,69,58,0.12) 0%, transparent 50%)",
};

const INTERVAL = 10000;

export default function HeroCarousel() {
  const [slides, setSlides] = useState<HeroSlide[]>(FALLBACK);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetchHeroSlides().then((data) => {
      if (data.length > 0) setSlides(data);
    });
  }, []);

  const next = useCallback(() => setActive((i) => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setActive((i) => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, INTERVAL);
    return () => clearInterval(t);
  }, [paused, next]);

  return (
    <div
      className="relative w-full overflow-hidden h-[180px] md:h-[220px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => {
        const accent = ACCENT[i % 3];
        const inner = (
          <div className="relative flex h-full flex-col justify-center px-8 md:px-20">
            {slide.tag && (
              <span
                className="mb-2 inline-block self-start rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
              >
                {slide.tag}
              </span>
            )}
            <h2 className="max-w-lg text-lg font-bold tracking-tight leading-snug md:text-3xl" style={{ color: "#f5f5f7" }}>
              {slide.headline}
            </h2>
            {slide.subtitle && (
              <p className="mt-1.5 max-w-md text-xs md:text-sm leading-relaxed hidden sm:block" style={{ color: "rgba(255,255,255,0.45)" }}>
                {slide.subtitle}
              </p>
            )}
            {slide.cta_text && slide.cta_url && !slide.is_clickable && (
              <Link
                href={slide.cta_url}
                className="mt-4 self-start rounded-xl px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.12)", color: "#f5f5f7" }}
              >
                {slide.cta_text}
              </Link>
            )}
          </div>
        );

        return (
          <div
            key={slide.id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: i === active ? 1 : 0,
              pointerEvents: i === active ? "auto" : "none",
              background: slide.picture_url ? undefined : slide.bg_gradient,
              backgroundColor: slide.picture_url ? "#080808" : undefined,
              backgroundImage: slide.picture_url
                ? `url(${slide.picture_url})`
                : undefined,
              backgroundSize: slide.picture_url ? "cover" : undefined,
              backgroundPosition: slide.picture_url ? "center" : undefined,
            }}
          >
            {/* Accent / overlay */}
            {!slide.picture_url && <div className="absolute inset-0" style={{ background: accent }} />}
            {slide.picture_url && (
              <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
            )}

            {/* Grain texture */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
                backgroundSize: "200px 200px",
                opacity: 0.5,
              }}
            />

            {/* Content — wrap in Link if is_clickable + cta_url set */}
            {slide.is_clickable && slide.cta_url ? (
              <Link href={slide.cta_url} className="block h-full w-full" style={{ cursor: "pointer" }}>
                {inner}
              </Link>
            ) : (
              inner
            )}
          </div>
        );
      })}

      {/* Prev / Next arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all hover:bg-white/15"
        style={{ width: 36, height: 36, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}
        aria-label="Forrige"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all hover:bg-white/15"
        style={{ width: 36, height: 36, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}
        aria-label="Neste"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-8 md:left-20 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className="transition-all duration-300"
            style={{
              width: i === active ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === active ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-px w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          key={active}
          className="h-full"
          style={{
            background: "rgba(255,255,255,0.25)",
            animation: paused ? "none" : `progress ${INTERVAL}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
      `}</style>
    </div>
  );
}
