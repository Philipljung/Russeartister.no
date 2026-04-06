"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Star, Pencil, ToggleLeft, ToggleRight, AlertCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

type GigRow = {
  id: string;
  title: string;
  category: string;
  is_active: boolean;
  avg_rating: number | null;
  review_count: number;
  cover_image_url: string | null;
  created_at: string;
  active_order_count: number;
  completed_order_count: number;
  packages: { price: number }[];
};

export default function MineTjenesterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadGigs();
  }, []);

  async function loadGigs() {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/logg-inn"); return; }

    const { data } = await supabase
      .from("gigs")
      .select(`
        id, title, category, is_active, avg_rating, review_count,
        cover_image_url, created_at,
        gig_packages(price),
        gig_orders(status)
      `)
      .eq("producer_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const mapped: GigRow[] = data.map((g: any) => ({
        id:                   g.id,
        title:                g.title,
        category:             g.category,
        is_active:            g.is_active,
        avg_rating:           g.avg_rating,
        review_count:         g.review_count,
        cover_image_url:      g.cover_image_url,
        created_at:           g.created_at,
        packages:             g.gig_packages ?? [],
        active_order_count:   (g.gig_orders ?? []).filter((o: any) =>
          ["pending_approval","approved","in_progress","delivered","revision_requested"].includes(o.status)
        ).length,
        completed_order_count: (g.gig_orders ?? []).filter((o: any) => o.status === "completed").length,
      }));
      setGigs(mapped);
    }
    setLoading(false);
  }

  async function toggleActive(gig: GigRow) {
    if (gig.active_order_count > 0 && gig.is_active) {
      toast("Du kan ikke deaktivere en tjeneste med aktive ordre.");
      return;
    }
    setTogglingId(gig.id);
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("gigs")
      .update({ is_active: !gig.is_active })
      .eq("id", gig.id);
    if (!error) {
      setGigs((prev) => prev.map((g) => g.id === gig.id ? { ...g, is_active: !g.is_active } : g));
      toast(gig.is_active ? "Tjeneste deaktivert" : "Tjeneste aktivert", "success");
    }
    setTogglingId(null);
  }

  const minPrice = (gig: GigRow) => {
    if (!gig.packages.length) return null;
    return Math.min(...gig.packages.map((p) => p.price));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="text-sm" style={{ color: "#3a3a3a" }}>Laster...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>Mine tjenester</h1>
          <p className="mt-1 text-sm" style={{ color: "#86868b" }}>{gigs.length}/3 tjenester opprettet</p>
        </div>
        {gigs.length < 3 && (
          <Link href="/lastopp-gig"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "#0071e3", color: "#fff" }}>
            <Plus size={14} />
            Ny tjeneste
          </Link>
        )}
      </div>

      {gigs.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
          <p className="text-sm mb-4" style={{ color: "#86868b" }}>Du har ingen tjenester enda.</p>
          <Link href="/lastopp-gig"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "#0071e3", color: "#fff" }}>
            <Plus size={14} />
            Opprett din første tjeneste
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {gigs.map((gig) => (
            <div key={gig.id} className="rounded-2xl p-5"
              style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", opacity: gig.is_active ? 1 : 0.6 }}>
              <div className="flex items-start gap-4">
                {/* Cover */}
                <div className="shrink-0 rounded-xl" style={{
                  width: 60, height: 60,
                  background: gig.cover_image_url ? `url(${gig.cover_image_url}) center/cover` : "#1e1e1e",
                  backgroundImage: gig.cover_image_url ? `url(${gig.cover_image_url})` : "none",
                  backgroundSize: "cover", backgroundPosition: "center",
                }} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug" style={{ color: "#f5f5f7" }}>{gig.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/lastopp-gig/${gig.id}`}
                        className="rounded-lg p-1.5 transition-opacity hover:opacity-70"
                        style={{ color: "#86868b" }}>
                        <Pencil size={14} />
                      </Link>
                      <button onClick={() => toggleActive(gig)} disabled={togglingId === gig.id}
                        className="transition-opacity hover:opacity-70 disabled:opacity-30"
                        title={gig.is_active ? "Deaktiver" : "Aktiver"}>
                        {gig.is_active
                          ? <ToggleRight size={22} style={{ color: "#34d399" }} />
                          : <ToggleLeft size={22} style={{ color: "#3a3a3a" }} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {minPrice(gig) !== null && (
                      <span className="text-xs" style={{ color: "#86868b" }}>
                        Fra kr {minPrice(gig)!.toLocaleString("nb-NO")}
                      </span>
                    )}
                    {gig.avg_rating && (
                      <span className="flex items-center gap-1 text-xs">
                        <Star size={10} fill="#eab308" color="#eab308" />
                        <span style={{ color: "#eab308" }}>{gig.avg_rating.toFixed(1)}</span>
                        <span style={{ color: "#3a3a3a" }}>({gig.review_count})</span>
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "#3a3a3a" }}>
                      {gig.completed_order_count} fullført
                    </span>
                    {gig.active_order_count > 0 && (
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}>
                        {gig.active_order_count} aktiv{gig.active_order_count > 1 ? "e" : ""}
                      </span>
                    )}
                  </div>

                  {gig.active_order_count > 0 && gig.is_active && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <AlertCircle size={11} style={{ color: "#ff9500" }} />
                      <p className="text-xs" style={{ color: "#ff9500" }}>
                        Kan ikke deaktiveres med aktive ordre
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
