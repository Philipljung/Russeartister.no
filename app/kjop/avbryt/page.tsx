"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";

export default function AvbrytPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6">
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 64,
          height: 64,
          background: "rgba(255,69,58,0.1)",
          border: "1px solid rgba(255,69,58,0.2)",
        }}
      >
        <XCircle size={28} style={{ color: "#ff453a" }} />
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>
          Betaling avbrutt
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#86868b" }}>
          Ingen betaling ble gjennomført.
        </p>
      </div>

      <Link
        href="/beats"
        className="rounded-2xl px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
        style={{ background: "#f5f5f7", color: "#080808" }}
      >
        Tilbake til beats
      </Link>
    </div>
  );
}
