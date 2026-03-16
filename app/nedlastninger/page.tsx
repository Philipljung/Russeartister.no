"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Music, RefreshCw, Package, AlertCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Purchase } from "@/lib/supabase/types";

type PurchaseWithDetails = Purchase & {
  beat?: {
    id: string;
    title: string;
    cover_url: string | null;
    genre: string;
    bpm: number;
    producer: { display_name: string } | null;
  };
  remake?: {
    id: string;
    title: string;
    cover_url: string | null;
    genre: string | null;
    bpm: number | null;
    producer: { display_name: string } | null;
  };
  sample?: {
    id: string;
    title: string;
    cover_url: string | null;
    item_type: string;
    producer: { display_name: string } | null;
  };
};

export default function NedlastningerPage() {
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);

      const { data } = await supabase
        .from("purchases")
        .select(`
          *,
          beat:beats(id, title, cover_url, genre, bpm, producer:profiles(display_name)),
          remake:remakes(id, title, cover_url, genre, bpm, producer:profiles(display_name)),
          sample:samples(id, title, cover_url, item_type, producer:profiles(display_name))
        `)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      setPurchases((data as PurchaseWithDetails[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function handleDownload(purchase: PurchaseWithDetails) {
    setDownloadingId(purchase.id);
    try {
      const res = await fetch(`/api/downloads/${purchase.id}`);
      if (!res.ok) throw new Error("Feil");
      // The route redirects to the signed URL — follow redirect by opening in same tab
      window.location.href = res.url;
    } catch {
      alert("Noe gikk galt. Prøv igjen.");
    } finally {
      setDownloadingId(null);
    }
  }

  const beats = purchases.filter((p) => p.item_type === "beat");
  const remakes = purchases.filter((p) => p.item_type === "remake");
  const samples = purchases.filter((p) => p.item_type === "sample");

  if (!loading && authed === false) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20 text-center">
        <p style={{ color: "#86868b" }}>Du må være innlogget for å se nedlastninger.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>
        Mine nedlastninger
      </h1>
      <p className="mb-10 text-sm" style={{ color: "#86868b" }}>
        Låter, remakes og samples du har kjøpt
      </p>

      {loading ? (
        <div className="mt-20 text-center" style={{ color: "#3a3a3a" }}>
          <p className="text-sm">Laster...</p>
        </div>
      ) : purchases.length === 0 ? (
        <EmptyAll />
      ) : (
        <>
          {beats.length > 0 && (
            <Section icon={<Music size={16} style={{ color: "#86868b" }} />} label="Kjøpte låter">
              {beats.map((p) => (
                <PurchaseRow
                  key={p.id}
                  title={p.beat?.title ?? "Ukjent"}
                  subtitle={[p.beat?.producer?.display_name, p.beat?.genre, p.beat?.bpm ? `${p.beat.bpm} BPM` : null].filter(Boolean).join(" · ")}
                  coverUrl={p.beat?.cover_url ?? null}
                  orderNumber={p.order_number}
                  amountNok={p.amount_paid}
                  createdAt={p.created_at}
                  downloading={downloadingId === p.id}
                  onDownload={() => handleDownload(p)}
                />
              ))}
            </Section>
          )}

          {remakes.length > 0 && (
            <Section icon={<RefreshCw size={16} style={{ color: "#86868b" }} />} label="Kjøpte remakes">
              {remakes.map((p) => (
                <PurchaseRow
                  key={p.id}
                  title={p.remake?.title ?? "Ukjent"}
                  subtitle={[p.remake?.producer?.display_name, p.remake?.genre, p.remake?.bpm ? `${p.remake.bpm} BPM` : null].filter(Boolean).join(" · ")}
                  coverUrl={p.remake?.cover_url ?? null}
                  orderNumber={p.order_number}
                  amountNok={p.amount_paid}
                  createdAt={p.created_at}
                  downloading={downloadingId === p.id}
                  onDownload={() => handleDownload(p)}
                />
              ))}
            </Section>
          )}

          {samples.length > 0 && (
            <Section icon={<Package size={16} style={{ color: "#86868b" }} />} label="Kjøpte samples og presets">
              {samples.map((p) => (
                <PurchaseRow
                  key={p.id}
                  title={p.sample?.title ?? "Ukjent"}
                  subtitle={[p.sample?.producer?.display_name, p.sample?.item_type].filter(Boolean).join(" · ")}
                  coverUrl={p.sample?.cover_url ?? null}
                  orderNumber={p.order_number}
                  amountNok={p.amount_paid}
                  createdAt={p.created_at}
                  downloading={downloadingId === p.id}
                  onDownload={() => handleDownload(p)}
                />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2
        className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight"
        style={{ color: "#f5f5f7" }}
      >
        {icon}
        {label}
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function PurchaseRow({
  title,
  subtitle,
  coverUrl,
  orderNumber,
  amountNok,
  createdAt,
  downloading,
  onDownload,
}: {
  title: string;
  subtitle: string;
  coverUrl: string | null;
  orderNumber: string | null;
  amountNok: number;
  createdAt: string;
  downloading: boolean;
  onDownload: () => void;
}) {
  const date = new Date(createdAt).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="flex items-center gap-4 rounded-xl px-4 py-3"
      style={{ background: "#141414", border: "1px solid #1e1e1e" }}
    >
      {/* Cover */}
      <div
        className="shrink-0 rounded-lg overflow-hidden"
        style={{ width: 48, height: 48, background: "#1e1e1e" }}
      >
        {coverUrl ? (
          <Image src={coverUrl} alt={title} width={48} height={48} style={{ objectFit: "cover" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={16} style={{ color: "#3a3a3a" }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate" style={{ color: "#f5f5f7" }}>{title}</p>
        <p className="text-xs truncate" style={{ color: "#86868b" }}>{subtitle}</p>
      </div>

      {/* Order + date */}
      <div className="hidden sm:block text-right shrink-0" style={{ minWidth: 110 }}>
        {orderNumber && (
          <p className="text-xs font-mono" style={{ color: "#86868b" }}>{orderNumber}</p>
        )}
        <p className="text-xs" style={{ color: "#3a3a3a" }}>{date}</p>
      </div>

      {/* Amount */}
      <div className="hidden md:block shrink-0 text-right" style={{ minWidth: 60 }}>
        <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>
          kr {amountNok.toLocaleString("nb-NO")}
        </p>
      </div>

      {/* Download */}
      <button
        onClick={onDownload}
        disabled={downloading}
        className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80"
        style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8" }}
      >
        <Download size={13} />
        {downloading ? "Laster..." : "Last ned"}
      </button>
    </div>
  );
}

function EmptyAll() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl py-20"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e1e" }}
    >
      <AlertCircle size={28} style={{ color: "#3a3a3a", marginBottom: 12 }} />
      <p className="text-sm font-medium" style={{ color: "#3a3a3a" }}>
        Ingen kjøp enda
      </p>
    </div>
  );
}
