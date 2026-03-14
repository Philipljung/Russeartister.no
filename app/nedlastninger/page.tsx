"use client";

import { Music, Package } from "lucide-react";

export default function NedlastningerPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1
        className="mb-1 text-2xl font-bold tracking-tight"
        style={{ color: "#f5f5f7" }}
      >
        Mine nedlastninger
      </h1>
      <p className="mb-10 text-sm" style={{ color: "#86868b" }}>
        Låter og samples du har kjøpt
      </p>

      {/* ── Kjøpte låter ── */}
      <section className="mb-12">
        <h2
          className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight"
          style={{ color: "#f5f5f7" }}
        >
          <Music size={16} style={{ color: "#86868b" }} />
          Kjøpte låter
        </h2>
        <EmptyState label="Ingen kjøpte låter enda" />
      </section>

      {/* ── Kjøpte samples & presets ── */}
      <section>
        <h2
          className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight"
          style={{ color: "#f5f5f7" }}
        >
          <Package size={16} style={{ color: "#86868b" }} />
          Kjøpt Samples & Presets
        </h2>
        <EmptyState label="Ingen kjøpte samples eller presets enda" />
      </section>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl py-14"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e1e" }}
    >
      <p className="text-sm font-medium" style={{ color: "#3a3a3a" }}>
        {label}
      </p>
    </div>
  );
}
