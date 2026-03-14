"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, ChevronDown, Check, SlidersHorizontal } from "lucide-react";

export const BPM_MIN = 60;
export const BPM_MAX = 220;
export const PRICE_MIN = 0;
export const PRICE_MAX = 30000;

export type Filters = {
  query: string;
  genre: string;
  vocal: "" | "med_vokal" | "uten_vokal";
  minBpm: number;
  maxBpm: number;
  minPrice: number;
  maxPrice: number;
  sortBy: string;
};

export const DEFAULT_FILTERS: Filters = {
  query: "",
  genre: "",
  vocal: "",
  minBpm: BPM_MIN,
  maxBpm: BPM_MAX,
  minPrice: PRICE_MIN,
  maxPrice: PRICE_MAX,
  sortBy: "newest",
};

const sortOptions = [
  { value: "newest", label: "Nyeste" },
  { value: "price_asc", label: "Pris: lav til høy" },
  { value: "price_desc", label: "Pris: høy til lav" },
  { value: "bpm_asc", label: "BPM: lav til høy" },
  { value: "bpm_desc", label: "BPM: høy til lav" },
];

// ── Custom genre dropdown ──────────────────────────────────────────────────
function GenreDropdown({
  value,
  genres,
  onChange,
}: {
  value: string;
  genres: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-all"
        style={{
          background: value ? "rgba(99,102,241,0.12)" : "#141414",
          border: `1px solid ${value ? "rgba(99,102,241,0.35)" : "#2a2a2a"}`,
          color: value ? "#818cf8" : "#f5f5f7",
          minWidth: 140,
          width: "100%",
        }}
      >
        <span className="flex-1 text-left">{value || "Alle sjangre"}</span>
        <ChevronDown
          size={13}
          style={{
            color: "#86868b",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 min-w-full overflow-hidden rounded-xl py-1 shadow-2xl"
          style={{
            background: "#1c1c1e",
            border: "1px solid #2a2a2a",
            zIndex: 100,
          }}
        >
          <button
            className="flex w-full items-center gap-2 px-3.5 py-2 text-sm transition-colors"
            style={{ color: !value ? "#f5f5f7" : "#86868b" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.05)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                "transparent")
            }
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            <span className="flex-1 text-left">Alle sjangre</span>
            {!value && <Check size={12} style={{ color: "#6366f1" }} />}
          </button>

          {genres.map((g) => (
            <button
              key={g}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-sm transition-colors"
              style={{ color: value === g ? "#f5f5f7" : "#86868b" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.05)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "transparent")
              }
              onClick={() => {
                onChange(g);
                setOpen(false);
              }}
            >
              <span className="flex-1 text-left">{g}</span>
              {value === g && <Check size={12} style={{ color: "#6366f1" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Custom sort dropdown ───────────────────────────────────────────────────
function SortDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-all"
        style={{
          background: "#141414",
          border: "1px solid #2a2a2a",
          color: "#f5f5f7",
          minWidth: 160,
          width: "100%",
        }}
      >
        <span className="flex-1 text-left">{selected?.label ?? "Sorter"}</span>
        <ChevronDown
          size={13}
          style={{
            color: "#86868b",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 min-w-full overflow-hidden rounded-xl py-1 shadow-2xl"
          style={{ background: "#1c1c1e", border: "1px solid #2a2a2a", zIndex: 100 }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-sm transition-colors"
              style={{ color: value === o.value ? "#f5f5f7" : "#86868b" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              <span className="flex-1 text-left">{o.label}</span>
              {value === o.value && <Check size={12} style={{ color: "#6366f1" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared drag logic ──────────────────────────────────────────────────────
function useDragValue(
  trackRef: React.RefObject<HTMLDivElement | null>,
  min: number,
  max: number,
  step: number,
  onCommit: (v: number) => void
) {
  const dragging = useRef(false);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  const getVal = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return min;
      const { left, width } = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - left) / width));
      const raw = min + pct * (max - min);
      return Math.round(raw / step) * step;
    },
    [trackRef, min, max, step]
  );

  function startDrag(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    dragging.current = true;

    function onMove(ev: MouseEvent | TouchEvent) {
      if (!dragging.current) return;
      const cx =
        "touches" in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      commitRef.current(getVal(cx));
    }
    function onUp() {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }

  return { startDrag, getVal };
}

// ── Dual-knob slider ───────────────────────────────────────────────────────
function DualKnobSlider({
  min,
  max,
  step = 1,
  minVal,
  maxVal,
  onMinChange,
  onMaxChange,
}: {
  min: number;
  max: number;
  step?: number;
  minVal: number;
  maxVal: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const range = max - min;
  const minPct = ((minVal - min) / range) * 100;
  const maxPct = ((maxVal - min) / range) * 100;

  const { startDrag: startMin } = useDragValue(trackRef, min, max, step, (v) =>
    onMinChange(Math.min(v, maxVal - step))
  );
  const { startDrag: startMax } = useDragValue(trackRef, min, max, step, (v) =>
    onMaxChange(Math.max(v, minVal + step))
  );

  const THUMB = 16;

  return (
    <div
      ref={trackRef}
      className="relative select-none"
      style={{ height: THUMB, marginLeft: THUMB / 2, marginRight: THUMB / 2 }}
    >
      {/* Track */}
      <div
        className="absolute top-1/2 w-full -translate-y-1/2 rounded-full"
        style={{ height: 2, background: "rgba(255,255,255,0.15)" }}
      />
      {/* Min thumb */}
      <div
        onMouseDown={startMin}
        onTouchStart={startMin}
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-shadow"
        style={{
          left: `${minPct}%`,
          width: THUMB,
          height: THUMB,
          background: "#f5f5f7",
          boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
          cursor: "grab",
          zIndex: 2,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 0 0 5px rgba(255,255,255,0.12)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 1px 4px rgba(0,0,0,0.5)";
        }}
      />
      {/* Max thumb */}
      <div
        onMouseDown={startMax}
        onTouchStart={startMax}
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-shadow"
        style={{
          left: `${maxPct}%`,
          width: THUMB,
          height: THUMB,
          background: "#f5f5f7",
          boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
          cursor: "grab",
          zIndex: 2,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 0 0 5px rgba(255,255,255,0.12)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 1px 4px rgba(0,0,0,0.5)";
        }}
      />
    </div>
  );
}

// ── Single-knob slider ─────────────────────────────────────────────────────
function SingleKnobSlider({
  min,
  max,
  step = 50,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = ((value - min) / (max - min)) * 100;
  const { startDrag } = useDragValue(trackRef, min, max, step, onChange);
  const THUMB = 16;

  return (
    <div
      ref={trackRef}
      className="relative select-none"
      style={{ height: THUMB, marginLeft: THUMB / 2, marginRight: THUMB / 2 }}
    >
      <div
        className="absolute top-1/2 w-full -translate-y-1/2 rounded-full"
        style={{ height: 2, background: "rgba(255,255,255,0.15)" }}
      />
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${pct}%`,
          width: THUMB,
          height: THUMB,
          background: "#f5f5f7",
          boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
          cursor: "grab",
          zIndex: 2,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 0 0 5px rgba(255,255,255,0.12)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 1px 4px rgba(0,0,0,0.5)";
        }}
      />
    </div>
  );
}

// ── Main filter bar ────────────────────────────────────────────────────────
type Props = {
  filters: Filters;
  genres: string[];
  onChange: (filters: Filters) => void;
};

export default function BeatFilters({ filters, genres, onChange }: Props) {
  // Local state for the search input — debounced before propagating
  const [inputQuery, setInputQuery] = useState(filters.query);
  // Mobile filter panel open/close
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      if (inputQuery !== filters.query) {
        onChange({ ...filters, query: inputQuery });
      }
    }, 300);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputQuery]);

  const activeFilterCount = [
    filters.genre !== "",
    filters.vocal !== "",
    filters.minBpm > BPM_MIN,
    filters.maxBpm < BPM_MAX,
    filters.minPrice > PRICE_MIN,
    filters.maxPrice < PRICE_MAX,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function reset() {
    setInputQuery("");
    onChange({ ...DEFAULT_FILTERS, query: "" });
  }

  const bpmActive = filters.minBpm > BPM_MIN || filters.maxBpm < BPM_MAX;
  const priceActive = filters.minPrice > PRICE_MIN || filters.maxPrice < PRICE_MAX;

  const filterPanel = (
    <div className="flex flex-wrap items-end gap-5">
      {/* Genre */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium" style={{ color: "#86868b" }}>
          Sjanger
        </span>
        <GenreDropdown
          value={filters.genre}
          genres={genres}
          onChange={(v) => set("genre", v)}
        />
      </div>

      {/* Vocal */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium" style={{ color: "#86868b" }}>Vokal</span>
        <div className="flex gap-1.5">
          {(["med_vokal", "uten_vokal"] as const).map((v) => (
            <button
              key={v}
              onClick={() => set("vocal", filters.vocal === v ? "" : v)}
              className="rounded-xl px-3 py-1.5 text-xs transition-all"
              style={{
                background: filters.vocal === v ? "rgba(99,102,241,0.12)" : "#141414",
                border: `1px solid ${filters.vocal === v ? "rgba(99,102,241,0.35)" : "#2a2a2a"}`,
                color: filters.vocal === v ? "#818cf8" : "#86868b",
              }}
            >
              {v === "med_vokal" ? "Med vokal" : "Uten vokal"}
            </button>
          ))}
        </div>
      </div>

      {/* BPM */}
      <div className="flex flex-col gap-2" style={{ minWidth: 180 }}>
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-medium"
            style={{ color: bpmActive ? "#f5f5f7" : "#86868b" }}
          >
            BPM
          </span>
          <span
            className="text-xs tabular-nums"
            style={{ color: bpmActive ? "#f5f5f7" : "#3a3a3a" }}
          >
            {filters.minBpm} — {filters.maxBpm}
          </span>
        </div>
        <DualKnobSlider
          min={BPM_MIN}
          max={BPM_MAX}
          step={1}
          minVal={filters.minBpm}
          maxVal={filters.maxBpm}
          onMinChange={(v) => set("minBpm", v)}
          onMaxChange={(v) => set("maxBpm", v)}
        />
      </div>

      {/* Price range */}
      <div className="flex flex-col gap-2" style={{ minWidth: 200 }}>
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-medium"
            style={{ color: priceActive ? "#f5f5f7" : "#86868b" }}
          >
            Pris
          </span>
          <span
            className="text-xs tabular-nums"
            style={{ color: priceActive ? "#f5f5f7" : "#3a3a3a" }}
          >
            {filters.minPrice <= PRICE_MIN && filters.maxPrice >= PRICE_MAX
              ? "Alle"
              : `kr ${filters.minPrice.toLocaleString("nb-NO")} — kr ${filters.maxPrice.toLocaleString("nb-NO")}`}
          </span>
        </div>
        <DualKnobSlider
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={50}
          minVal={filters.minPrice}
          maxVal={filters.maxPrice}
          onMinChange={(v) => set("minPrice", v)}
          onMaxChange={(v) => set("maxPrice", v)}
        />
      </div>

      <div className="flex-1" />

      {/* Sort */}
      <div className="flex shrink-0 flex-col gap-2">
        <span className="text-xs font-medium" style={{ color: "#86868b" }}>
          Sorter
        </span>
        <SortDropdown
          value={filters.sortBy}
          options={sortOptions}
          onChange={(v) => set("sortBy", v)}
        />
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <button
          onClick={reset}
          className="flex shrink-0 items-center gap-1.5 self-end rounded-xl px-3 py-2 text-xs"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid #2a2a2a",
            color: "#86868b",
          }}
        >
          <X size={12} />
          Nullstill
        </button>
      )}
    </div>
  );

  return (
    <div
      className="sticky top-14 z-40 border-b"
      style={{
        background: "rgba(8,8,8,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "#1e1e1e",
      }}
    >
      <div className="mx-auto max-w-7xl space-y-3 px-4 md:px-6 py-4">
        {/* Search + mobile filter toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "#86868b" }}
            />
            <input
              type="text"
              placeholder="Søk etter beats, sjanger, tags..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              style={{
                background: "#141414",
                border: "1px solid #2a2a2a",
                borderRadius: 12,
                padding: "9px 12px 9px 36px",
                paddingRight: filters.query ? 36 : 12,
                fontSize: 13,
                color: "#f5f5f7",
                outline: "none",
                width: "100%",
              }}
            />
            {inputQuery && (
              <button
                onClick={() => { setInputQuery(""); onChange({ ...filters, query: "" }); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2"
                style={{ color: "#86868b" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Mobile: filter toggle button */}
          <button
            className="md:hidden flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
            style={{
              background: filtersOpen || hasActiveFilters ? "rgba(99,102,241,0.12)" : "#141414",
              border: `1px solid ${filtersOpen || hasActiveFilters ? "rgba(99,102,241,0.35)" : "#2a2a2a"}`,
              color: filtersOpen || hasActiveFilters ? "#818cf8" : "#86868b",
              whiteSpace: "nowrap",
            }}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <SlidersHorizontal size={13} />
            {hasActiveFilters ? `Filter (${activeFilterCount})` : "Filter"}
          </button>
        </div>

        {/* Desktop: always-visible filter row */}
        <div className="hidden md:block">
          {filterPanel}
        </div>

        {/* Mobile: collapsible filter panel */}
        {filtersOpen && (
          <div className="md:hidden">
            {filterPanel}
          </div>
        )}
      </div>
    </div>
  );
}
