"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Clock, RefreshCw, ChevronLeft, CheckCircle2, Play, AlertTriangle, AlertCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

type Package = {
  id: string;
  label: string;
  description: string | null;
  price: number;
  delivery_days: number;
  revisions: number;
  sort_order: number;
};

type CustomQuestion = { id: string; question: string };

type Gig = {
  id: string;
  title: string;
  description: string;
  category: string;
  terms: string | null;
  ghostprod_option: "ghostprod" | "credits" | "both";
  cover_image_url: string | null;
  demo_url: string | null;
  demo_type: "audio" | "video" | null;
  avg_rating: number | null;
  review_count: number;
  completed_count: number;
  producer: { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
  packages: Package[];
  custom_questions: CustomQuestion[];
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { display_name: string | null; username: string | null };
};

// ── Date calc helper ──────────────────────────────────────────────────────────
function calcRecommendedDate(deliveryDays: number, revisions: number, daysBetween: number): Date {
  const distrokidBuffer = 5; // days for distribution
  const totalDays = deliveryDays + (revisions > 0 ? revisions * daysBetween : 0) + distrokidBuffer;
  const d = new Date();
  d.setDate(d.getDate() + totalDays);
  return d;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
}

export default function GigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { toast } = useToast();

  const [gig, setGig]         = useState<Gig | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [modalOpen, setModalOpen]     = useState(false);
  const [session, setSession]         = useState<any>(null);

  // Søknad form state
  const [requirements, setRequirements]         = useState("");
  const [firstDraftDate, setFirstDraftDate]     = useState("");
  const [daysBetweenRevisions, setDaysBetweenRevisions] = useState("3");
  const [ghostprodChoice, setGhostprodChoice]   = useState<"ghostprod" | "credits">("credits");
  const [customAnswers, setCustomAnswers]        = useState<Record<string, string>>({});
  const [acceptTerms, setAcceptTerms]           = useState(false);
  const [acceptNoCancel, setAcceptNoCancel]     = useState(false);
  const [submitting, setSubmitting]             = useState(false);
  const [formError, setFormError]               = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);

      const [{ data: g }, { data: r }] = await Promise.all([
        supabase
          .from("gigs")
          .select(`
            id, title, description, category, terms, ghostprod_option,
            cover_image_url, demo_url, demo_type, avg_rating, review_count,
            profiles!producer_id(id, display_name, username, avatar_url),
            gig_packages(id, label, description, price, delivery_days, revisions, sort_order),
            gig_custom_questions(id, question, sort_order),
            gig_orders(id, status)
          `)
          .eq("id", id)
          .eq("is_active", true)
          .single(),
        supabase
          .from("gig_reviews")
          .select(`id, rating, comment, created_at, profiles!reviewer_id(display_name, username)`)
          .eq("gig_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (!g) { router.push("/tjenester"); return; }
      const pkgs = (g.gig_packages ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
      const completedCount = (g.gig_orders ?? []).filter((o: any) => o.status === "completed").length;
      setGig({
        ...g,
        producer:          g.profiles as any,
        packages:          pkgs,
        custom_questions:  (g.gig_custom_questions ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
        completed_count:   completedCount,
      });
      setSelectedPkg(pkgs[0] ?? null);
      setReviews((r ?? []).map((rv: any) => ({ ...rv, reviewer: rv.profiles })));
      setLoading(false);
    })();
  }, [id]);

  // ── Warning logic ─────────────────────────────────────────────────────────
  const showDateWarning = (): string | null => {
    if (!firstDraftDate || !selectedPkg) return null;
    const requested = new Date(firstDraftDate);
    const revCount  = selectedPkg.revisions === -1 ? 3 : selectedPkg.revisions;
    const days      = parseInt(daysBetweenRevisions) || 3;
    const recommended = calcRecommendedDate(selectedPkg.delivery_days, revCount, days);
    if (requested < recommended) {
      return `Anbefalt tidligste dato er ${formatDate(recommended)} basert på leveringstid + ${revCount} revisjon${revCount !== 1 ? "er" : ""} (${days} dager mellom) + 5 dagers distribusjonsbuffer.`;
    }
    return null;
  };

  // ── Submit søknad ─────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!session) { router.push("/logg-inn"); return; }
    if (!selectedPkg) return;
    if (!requirements.trim()) { setFormError("Fyll ut hva du ønsker."); return; }
    if (!firstDraftDate) { setFormError("Velg ønsket dato for førsteutkast."); return; }
    if (!acceptTerms || !acceptNoCancel) { setFormError("Du må godta begge vilkårene."); return; }

    setSubmitting(true);
    const supabase = getSupabaseClient();

    const customAnswersArr = gig!.custom_questions.map((q) => ({
      question: q.question,
      answer:   customAnswers[q.id] ?? "",
    }));

    const price        = selectedPkg.price;
    const platform_fee = Math.round(price * 0.2);
    const artist_payout = price - platform_fee;

    const { data: order, error } = await supabase
      .from("gig_orders")
      .insert({
        gig_id:                 gig!.id,
        buyer_id:               session.user.id,
        producer_id:            gig!.producer.id,
        package_id:             selectedPkg.id,
        price,
        platform_fee,
        artist_payout,
        status:                 "pending_approval",
        requirements:           requirements.trim(),
        requested_first_draft:  firstDraftDate,
        days_between_revisions: parseInt(daysBetweenRevisions) || 3,
        ghostprod:              ghostprodChoice === "ghostprod",
        custom_answers:         customAnswersArr,
        revisions_max:          selectedPkg.revisions,
        contract_accepted_at:   new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !order) {
      setFormError("Kunne ikke sende søknad: " + error?.message);
      setSubmitting(false);
      return;
    }

    // Insert notification for producer
    await supabase.from("notifications").insert({
      user_id:  gig!.producer.id,
      type:     "new_order",
      order_id: order.id,
    });

    toast("Søknad sendt!", "success");
    router.push(`/meldinger/${order.id}`);
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-center"><p className="text-sm" style={{ color: "#3a3a3a" }}>Laster...</p></div>;
  }
  if (!gig || !selectedPkg) return null;

  const dateWarning = showDateWarning();

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6 py-8">
      <Link href="/tjenester" className="mb-6 inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-60" style={{ color: "#86868b" }}>
        <ChevronLeft size={14} /> Tjenester
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left — main info */}
        <div className="md:col-span-2 flex flex-col gap-6">

          {/* Cover / Demo */}
          {gig.cover_image_url && (
            <div className="rounded-2xl overflow-hidden" style={{ height: 260, background: `url(${gig.cover_image_url}) center/cover` }} />
          )}
          {gig.demo_url && gig.demo_type === "audio" && (
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
              <Play size={16} style={{ color: "#818cf8" }} />
              <audio controls src={gig.demo_url} className="flex-1 h-8" style={{ accentColor: "#818cf8" }} />
            </div>
          )}
          {gig.demo_url && gig.demo_type === "video" && (
            <video controls src={gig.demo_url} className="rounded-2xl w-full" style={{ maxHeight: 360 }} />
          )}

          {/* Producer */}
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                width: 44, height: 44,
                background: gig.producer.avatar_url ? `url(${gig.producer.avatar_url}) center/cover` : "linear-gradient(135deg,#2a1a5e,#1a2a5e)",
                backgroundImage: gig.producer.avatar_url ? `url(${gig.producer.avatar_url})` : undefined,
                color: "rgba(255,255,255,0.6)",
              }}>
              {!gig.producer.avatar_url && (gig.producer.display_name ?? gig.producer.username ?? "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#f5f5f7" }}>{gig.producer.display_name ?? gig.producer.username}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {gig.avg_rating && (
                  <span className="flex items-center gap-1 text-xs">
                    <Star size={10} fill="#eab308" color="#eab308" />
                    <span style={{ color: "#eab308" }}>{gig.avg_rating.toFixed(1)}</span>
                    <span style={{ color: "#3a3a3a" }}>({gig.review_count})</span>
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs" style={{ color: "#3a3a3a" }}>
                  <CheckCircle2 size={10} style={{ color: "#34d399" }} />
                  {gig.completed_count} fullført
                </span>
              </div>
            </div>
          </div>

          {/* Title + description */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-3" style={{ color: "#f5f5f7" }}>{gig.title}</h1>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#86868b" }}>{gig.description}</p>
          </div>

          {/* Ghostprod info */}
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", color: "#86868b" }}>
            <span className="font-medium" style={{ color: "#f5f5f7" }}>Credits: </span>
            {gig.ghostprod_option === "ghostprod" ? "Kun ghostprod — artisten publiserer selv uten credits" :
             gig.ghostprod_option === "credits"   ? "Med credits — produsenten krediteres" :
             "Tilbyr begge — avtal med artisten"}
          </div>

          {/* Terms */}
          {gig.terms && (
            <div className="rounded-xl px-4 py-3" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "#f5f5f7" }}>Leveringsvilkår</p>
              <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: "#86868b" }}>{gig.terms}</p>
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: "#f5f5f7" }}>Anmeldelser ({reviews.length})</p>
              <div className="flex flex-col gap-3">
                {reviews.map((rv) => (
                  <div key={rv.id} className="rounded-xl p-4" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium" style={{ color: "#f5f5f7" }}>{rv.reviewer.display_name ?? rv.reviewer.username}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={10} fill={i < rv.rating ? "#eab308" : "transparent"} color="#eab308" />
                        ))}
                      </div>
                      <span className="text-xs ml-auto" style={{ color: "#3a3a3a" }}>
                        {new Date(rv.created_at).toLocaleDateString("nb-NO")}
                      </span>
                    </div>
                    {rv.comment && <p className="text-xs leading-relaxed" style={{ color: "#86868b" }}>{rv.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — package selector + bestill */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-5 sticky top-20" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
            {/* Package tabs */}
            {gig.packages.length > 1 && (
              <div className="flex gap-1.5 mb-4">
                {gig.packages.map((p) => (
                  <button key={p.id} onClick={() => setSelectedPkg(p)}
                    className="flex-1 rounded-lg py-1.5 text-xs font-medium transition-all"
                    style={{
                      background: selectedPkg?.id === p.id ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${selectedPkg?.id === p.id ? "rgba(99,102,241,0.35)" : "#2a2a2a"}`,
                      color: selectedPkg?.id === p.id ? "#818cf8" : "#3a3a3a",
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {selectedPkg && (
              <>
                <p className="text-xl font-bold mb-1" style={{ color: "#f5f5f7" }}>
                  kr {selectedPkg.price.toLocaleString("nb-NO")}
                </p>
                {selectedPkg.description && (
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: "#86868b" }}>{selectedPkg.description}</p>
                )}
                <div className="flex flex-col gap-2 text-xs mb-4" style={{ color: "#86868b" }}>
                  <span className="flex items-center gap-2"><Clock size={12} /> {selectedPkg.delivery_days} dagers leveringstid</span>
                  <span className="flex items-center gap-2">
                    <RefreshCw size={12} />
                    {selectedPkg.revisions === -1 ? "Ubegrenset revisjoner" :
                     selectedPkg.revisions === 0  ? "Ingen revisjoner" :
                     `${selectedPkg.revisions} revisjon${selectedPkg.revisions > 1 ? "er" : ""}`}
                  </span>
                </div>
                <button
                  onClick={() => { if (!session) { router.push("/logg-inn"); return; } setModalOpen(true); }}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "#f5f5f7", color: "#080808" }}>
                  Bestill
                </button>
                <p className="mt-3 text-center text-xs" style={{ color: "#3a3a3a" }}>
                  Artisten godkjenner søknaden før betaling
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Søknad modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: "#111", border: "1px solid #2a2a2a" }}>
            <h2 className="text-lg font-bold mb-1" style={{ color: "#f5f5f7" }}>Send søknad</h2>
            <p className="text-xs mb-5" style={{ color: "#86868b" }}>
              Artisten godkjenner søknaden og kontakter deg. Betaling skjer etter godkjenning.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Valgt pakke */}
              <div className="rounded-xl px-4 py-3 text-xs flex items-center justify-between"
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                <span style={{ color: "#86868b" }}>Pakke: <span style={{ color: "#f5f5f7" }}>{selectedPkg!.label}</span></span>
                <span style={{ color: "#f5f5f7", fontWeight: 600 }}>kr {selectedPkg!.price.toLocaleString("nb-NO")}</span>
              </div>

              {/* Requirements */}
              <div>
                <ModalLabel>Hva vil du ha? *</ModalLabel>
                <textarea placeholder="Beskriv låten du ønsker — stil, stemning, referanser, BPM, toneart..."
                  value={requirements} onChange={(e) => setRequirements(e.target.value)}
                  rows={4} style={{ ...modalInputStyle, resize: "vertical" }} />
              </div>

              {/* Dato */}
              <div>
                <ModalLabel>Ønsket dato for førsteutkast *</ModalLabel>
                <p className="mb-1.5 text-xs" style={{ color: "#3a3a3a" }}>Sett denne datoen i god tid før den skal releases</p>
                <input type="date" value={firstDraftDate} onChange={(e) => setFirstDraftDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  style={modalInputStyle} />
                {dateWarning && (
                  <div className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.2)" }}>
                    <AlertTriangle size={13} style={{ color: "#ff9500", flexShrink: 0, marginTop: 1 }} />
                    <p className="text-xs leading-relaxed" style={{ color: "#ff9500" }}>{dateWarning}</p>
                  </div>
                )}
              </div>

              {/* Tid mellom revisjoner */}
              {selectedPkg!.revisions !== 0 && (
                <div>
                  <ModalLabel>Tid mellom revisjoner (dager)</ModalLabel>
                  <select value={daysBetweenRevisions} onChange={(e) => setDaysBetweenRevisions(e.target.value)}
                    style={{ ...modalInputStyle, cursor: "pointer" }}>
                    {[1,2,3,4,5,7].map((d) => <option key={d} value={d}>{d} dag{d > 1 ? "er" : ""}</option>)}
                  </select>
                </div>
              )}

              {/* Ghostprod */}
              {gig.ghostprod_option === "both" && (
                <div>
                  <ModalLabel>Ghostprod eller med credits?</ModalLabel>
                  <div className="flex gap-2">
                    {(["ghostprod", "credits"] as const).map((opt) => (
                      <button key={opt} type="button" onClick={() => setGhostprodChoice(opt)}
                        className="flex-1 rounded-xl py-2 text-xs font-medium transition-all"
                        style={{
                          background: ghostprodChoice === opt ? "rgba(99,102,241,0.12)" : "#1a1a1a",
                          border: `1px solid ${ghostprodChoice === opt ? "rgba(99,102,241,0.4)" : "#2a2a2a"}`,
                          color: ghostprodChoice === opt ? "#818cf8" : "#86868b",
                        }}>
                        {opt === "ghostprod" ? "Ghostprod" : "Med credits"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom questions */}
              {gig.custom_questions.map((q) => (
                <div key={q.id}>
                  <ModalLabel>{q.question}</ModalLabel>
                  <textarea rows={2} value={customAnswers[q.id] ?? ""}
                    onChange={(e) => setCustomAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    style={{ ...modalInputStyle, resize: "vertical" }} />
                </div>
              ))}

              {/* Vilkår */}
              <div className="flex flex-col gap-3 rounded-xl p-4" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                <ModalCheckbox checked={acceptNoCancel} onChange={setAcceptNoCancel}>
                  Jeg bekrefter at jeg ikke kan kansellere kjøpet etter betaling er gjennomført
                </ModalCheckbox>
                <ModalCheckbox checked={acceptTerms} onChange={setAcceptTerms}>
                  Jeg har lest og aksepterer artistens leveringsvilkår{gig.terms ? ` ("${gig.terms.slice(0, 60)}${gig.terms.length > 60 ? "..." : ""}")` : ""}
                </ModalCheckbox>
              </div>

              {formError && (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)" }}>
                  <AlertCircle size={13} style={{ color: "#ff453a" }} />
                  <p className="text-xs" style={{ color: "#ff453a" }}>{formError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={submitting}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: "#0071e3", color: "#fff" }}>
                  {submitting ? "Sender..." : "Send søknad"}
                </button>
                <button type="button" onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm transition-opacity hover:opacity-80"
                  style={{ color: "#86868b" }}>
                  Avbryt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-medium" style={{ color: "#86868b" }}>{children}</p>;
}

function ModalCheckbox({ checked, onChange, children }: {
  checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div onClick={() => onChange(!checked)}
        className="shrink-0 rounded-md flex items-center justify-center transition-all mt-0.5"
        style={{ width: 16, height: 16, background: checked ? "#0071e3" : "#2a2a2a", border: `1px solid ${checked ? "#0071e3" : "#3a3a3a"}` }}>
        {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3 5.5L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>}
      </div>
      <span className="text-xs leading-relaxed" style={{ color: "#86868b" }}>{children}</span>
    </label>
  );
}

const modalInputStyle: React.CSSProperties = {
  background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12,
  padding: "10px 14px", fontSize: 13, color: "#f5f5f7", outline: "none", width: "100%",
};
