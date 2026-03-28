"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

function normalizeGenre(g: string) {
  return g.trim().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  existingGenres: string[];
  placeholder?: string;
  inputStyle?: React.CSSProperties;
};

export default function GenreAutocomplete({
  value,
  onChange,
  existingGenres,
  placeholder = "Drill",
  inputStyle,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = value.trim()
    ? existingGenres.filter((g) => g.toLowerCase().includes(value.toLowerCase()) && g.toLowerCase() !== value.toLowerCase())
    : existingGenres;

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const defaultInputStyle: React.CSSProperties = {
    background: "#141414",
    border: "1px solid #2a2a2a",
    borderRadius: 12,
    padding: "9px 32px 9px 12px",
    fontSize: 13,
    color: "#f5f5f7",
    outline: "none",
    width: "100%",
    ...inputStyle,
  };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onBlur={() => { if (value.trim()) onChange(normalizeGenre(value)); }}
        onFocus={() => setOpen(true)}
        required
        style={defaultInputStyle}
      />
      <ChevronDown
        size={13}
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "#3a3a3a" }}
      />

      {open && suggestions.length > 0 && (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl py-1 shadow-2xl"
          style={{ background: "#1c1c1e", border: "1px solid #2a2a2a" }}
        >
          {suggestions.map((g) => (
            <button
              key={g}
              type="button"
              className="flex w-full items-center px-3.5 py-2 text-sm transition-colors text-left"
              style={{ color: value === g ? "#f5f5f7" : "#86868b" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
              onClick={() => { onChange(g); setOpen(false); }}
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
