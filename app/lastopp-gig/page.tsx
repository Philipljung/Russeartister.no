"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ImageIcon, Music, Video, X, AlertCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";
import ImageCropModal from "@/components/ImageCropModal";
import Link from "next/link";

const REVISION_OPTIONS = [
  { value: 0,  label: "Ingen revisjoner" },
  { value: 1,  label: "1 revisjon" },
  { value: 2,  label: "2 revisjoner" },
  { value: 3,  label: "3 revisjoner" },
  { value: -1, label: "Ubegrenset" },
];

type Package = {
  label: string;
  description: string;
  price: string;
  delivery_days: string;
  revisions: number;
};

const emptyPackage = (): Package => ({
  label: "", description: "", price: "", delivery_days: "", revisions: 1,
});

export default function LastOppGigPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);
  const [gigCount, setGigCount] = useState<number | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStripeReady(false); return; }
      const [profileRes, gigsRes] = await Promise.all([
        supabase.from("profiles").select("stripe_onboarding_complete").eq("id", session.user.id).single(),
        supabase.from("gigs").select("id", { count: "exact", head: true }).eq("producer_id", session.user.id),
      ]);
      setStripeReady(profileRes.data?.stripe_onboarding_complete ?? false);
      setGigCount(gigsRes.count ?? 0);
    })();
  }, []);

  // Form state
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [ghostprodOption, setGhostprodOption] = useState<"ghostprod" | "credits" | "both">("credits");
  const [terms, setTerms]           = useState("");
  const [packages, setPackages]     = useState<Package[]>([emptyPackage()]);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [customQInput, setCustomQInput] = useState("");
  const [acceptNoReject, setAcceptNoReject]   = useState(false);
  const [acceptTerms, setAcceptTerms]         = useState(false);

  // Files
  const [cover, setCover]   = useState<{ file: File; previewUrl: string } | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [demo, setDemo]     = useState<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const demoInputRef  = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Package helpers ────────────────────────────────────────────────────────
  function updatePackage<K extends keyof Package>(idx: number, key: K, val: Package[K]) {
    setPackages((prev) => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p));
  }

  function addPackage() {
    if (packages.length < 3) setPackages((p) => [...p, emptyPackage()]);
  }

  function removePackage(idx: number) {
    if (packages.length > 1) setPackages((p) => p.filter((_, i) => i !== idx));
  }

  // ── Custom questions ──────────────────────────────────────────────────────
  function addQuestion() {
    const q = customQInput.trim();
    if (!q || customQuestions.length >= 3) return;
    setCustomQuestions((prev) => [...prev, q]);
    setCustomQInput("");
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("Fyll ut tittel og beskrivelse."); return;
    }
    if (packages.some((p) => !p.label.trim() || !p.price || !p.delivery_days)) {
      setError("Fyll ut navn, pris og leveringstid på alle pakker."); return;
    }
    if (!acceptNoReject || !acceptTerms) {
      setError("Du må godta begge vilkårene."); return;
    }
    if ((gigCount ?? 0) >= 3) {
      setError("Du kan maks ha 3 aktive tjenester."); return;
    }

    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Du må være innlogget."); return; }

    setSubmitting(true);
    const userId    = session.user.id;
    const timestamp = Date.now();

    // Upload cover
    let coverUrl: string | null = null;
    if (cover?.file) {
      const ext  = "webp";
      const path = `${userId}/${timestamp}_cover.${ext}`;
      const { error: upErr } = await supabase.storage.from("gig-covers").upload(path, cover.file, { upsert: false });
      if (!upErr) {
        const { data } = supabase.storage.from("gig-covers").getPublicUrl(path);
        coverUrl = data.publicUrl;
      }
    }

    // Upload demo
    let demoUrl: string | null  = null;
    let demoType: string | null = null;
    if (demo) {
      const ext  = demo.name.split(".").pop() ?? "bin";
      const path = `${userId}/${timestamp}_demo.${ext}`;
      const { error: upErr } = await supabase.storage.from("gig-demos").upload(path, demo, { upsert: false });
      if (!upErr) {
        const { data } = supabase.storage.from("gig-demos").getPublicUrl(path);
        demoUrl  = data.publicUrl;
        demoType = demo.type.startsWith("video") ? "video" : "audio";
      }
    }

    // Insert gig
    const { data: gig, error: gigErr } = await supabase
      .from("gigs")
      .insert({
        producer_id:      userId,
        title:            title.trim(),
        description:      description.trim(),
        category:         "produksjon",
        ghostprod_option: ghostprodOption,
        terms:            terms.trim() || null,
        is_active:        true,
        cover_image_url:  coverUrl,
        demo_url:         demoUrl,
        demo_type:        demoType,
      })
      .select("id")
      .single();

    if (gigErr || !gig) {
      setError("Kunne ikke opprette tjeneste: " + gigErr?.message);
      setSubmitting(false);
      return;
    }

    // Insert packages
    const pkgRows = packages.map((p, i) => ({
      gig_id:       gig.id,
      label:        p.label.trim(),
      description:  p.description.trim() || null,
      price:        Math.round(parseFloat(p.price) * 100), // store as øre? No — keep as NOK integer
      delivery_days: parseInt(p.delivery_days),
      revisions:    p.revisions,
      sort_order:   i,
    }));

    // price is stored as whole NOK (not øre) to match existing beats table pattern
    const pkgRowsNok = packages.map((p, i) => ({
      gig_id:        gig.id,
      label:         p.label.trim(),
      description:   p.description.trim() || null,
      price:         parseInt(p.price),
      delivery_days: parseInt(p.delivery_days),
      revisions:     p.revisions,
      sort_order:    i,
    }));

    const { error: pkgErr } = await supabase.from("gig_packages").insert(pkgRowsNok);
    if (pkgErr) {
      setError("Pakker ble ikke lagret: " + pkgErr.message);
      setSubmitting(false);
      return;
    }

    // Insert custom questions
    if (customQuestions.length > 0) {
      await supabase.from("gig_custom_questions").insert(
        customQuestions.map((q, i) => ({ gig_id: gig.id, question: q, sort_order: i }))
      );
    }

    toast("Tjeneste publisert!", "success");
    router.push("/mine-tjenester");
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (stripeReady === false) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="text-sm" style={{ color: "#86868b" }}>
          Du må ha Stripe satt opp for å tilby tjenester.{" "}
          <Link href="/profile" className="underline" style={{ color: "#ff9500" }}>
            Sett opp Stripe
          </Link>
        </p>
      </div>
    );
  }

  if (gigCount !== null && gigCount >= 3) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="text-sm" style={{ color: "#86868b" }}>
          Du har allerede 3 tjenester. Gå til{" "}
          <Link href="/mine-tjenester" className="underline" style={{ color: "#818cf8" }}>
            Mine tjenester
          </Link>{" "}
          for å administrere dem.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>
        Opprett tjeneste
      </h1>
      <p className="mb-8 text-sm" style={{ color: "#86868b" }}>
        Tilby produksjon av låt til russekunder.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Cover + tittel */}
        <div className="flex gap-5 items-start">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="shrink-0 rounded-2xl overflow-hidden transition-opacity hover:opacity-80"
            style={{
              width: 100, height: 100,
              backgroundColor: cover ? "transparent" : "#141414",
              backgroundImage: cover ? `url(${cover.previewUrl})` : "none",
              backgroundSize: "cover", backgroundPosition: "center",
              border: "1px solid #2a2a2a",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {!cover && <><ImageIcon size={20} style={{ color: "#3a3a3a" }} /><span className="text-xs" style={{ color: "#3a3a3a" }}>Cover</span></>}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropSrc(URL.createObjectURL(f)); }} />

          <div className="flex-1">
            <Label>Tittel *</Label>
            <input type="text" placeholder="Custom russebuss-banger" value={title}
              onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Beskrivelse */}
        <div>
          <Label>Beskrivelse *</Label>
          <textarea placeholder="Fortell hva du tilbyr, stil, erfaring..." value={description}
            onChange={(e) => setDescription(e.target.value)} rows={4}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        {/* Ghostprod / Credits */}
        <div>
          <Label>Ghostprod eller credits?</Label>
          <div className="flex gap-2">
            {(["ghostprod", "credits", "both"] as const).map((opt) => (
              <button key={opt} type="button"
                onClick={() => setGhostprodOption(opt)}
                className="rounded-xl px-4 py-2 text-sm font-medium transition-all"
                style={{
                  background: ghostprodOption === opt ? "rgba(99,102,241,0.12)" : "#141414",
                  border: `1px solid ${ghostprodOption === opt ? "rgba(99,102,241,0.4)" : "#2a2a2a"}`,
                  color: ghostprodOption === opt ? "#818cf8" : "#86868b",
                  cursor: "pointer",
                }}
              >
                {opt === "ghostprod" ? "Kun ghostprod" : opt === "credits" ? "Med credits" : "Tilbyr begge"}
              </button>
            ))}
          </div>
        </div>

        {/* Demo */}
        <div>
          <Label>Eksempelarbeid (valgfritt)</Label>
          <p className="mb-2 text-xs" style={{ color: "#3a3a3a" }}>Last opp en lydfil eller video som viser arbeidet ditt</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => demoInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: "#141414", border: "1px solid #2a2a2a", color: "#86868b" }}>
              {demo?.type.startsWith("video") ? <Video size={14} /> : <Music size={14} />}
              {demo ? demo.name : "Velg fil"}
            </button>
            {demo && (
              <button type="button" onClick={() => { setDemo(null); if (demoInputRef.current) demoInputRef.current.value = ""; }}
                className="rounded-lg p-1.5" style={{ color: "#86868b" }}>
                <X size={14} />
              </button>
            )}
          </div>
          <input ref={demoInputRef} type="file"
            accept="audio/mpeg,audio/wav,video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setDemo(f); }} />
        </div>

        {/* Pakker */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Pakker ({packages.length}/3) *</Label>
            {packages.length < 3 && (
              <button type="button" onClick={addPackage}
                className="flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-opacity hover:opacity-80"
                style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}>
                <Plus size={12} /> Legg til pakke
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {packages.map((pkg, idx) => (
              <div key={idx} className="rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#3a3a3a" }}>
                    Pakke {idx + 1}
                  </span>
                  {packages.length > 1 && (
                    <button type="button" onClick={() => removePackage(idx)}
                      className="rounded-lg p-1 transition-opacity hover:opacity-70" style={{ color: "#86868b" }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Pakkenavn *</Label>
                    <input type="text" placeholder="Demo, Standard, Full produksjon..."
                      value={pkg.label} onChange={(e) => updatePackage(idx, "label", e.target.value)}
                      style={inputStyle} />
                  </div>
                  <div>
                    <Label>Pris (kr) *</Label>
                    <input type="number" placeholder="999" min={0}
                      value={pkg.price} onChange={(e) => updatePackage(idx, "price", e.target.value)}
                      style={inputStyle} />
                  </div>
                  <div>
                    <Label>Leveringstid (dager) *</Label>
                    <input type="number" placeholder="5" min={1}
                      value={pkg.delivery_days} onChange={(e) => updatePackage(idx, "delivery_days", e.target.value)}
                      style={inputStyle} />
                  </div>
                  <div>
                    <Label>Revisjoner</Label>
                    <select value={pkg.revisions} onChange={(e) => updatePackage(idx, "revisions", parseInt(e.target.value))}
                      style={{ ...inputStyle, cursor: "pointer" }}>
                      {REVISION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Beskrivelse av pakken</Label>
                  <input type="text" placeholder="Hva er inkludert i denne pakken..."
                    value={pkg.description} onChange={(e) => updatePackage(idx, "description", e.target.value)}
                    style={inputStyle} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leveringsvilkår */}
        <div>
          <Label>Leveringsvilkår (valgfritt)</Label>
          <textarea placeholder="F.eks: Du eier rettighetene etter betaling er mottatt. Ingen refusjon etter at arbeid er påbegynt."
            value={terms} onChange={(e) => setTerms(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        {/* Custom spørsmål */}
        <div>
          <Label>Egne spørsmål til kunden ({customQuestions.length}/3)</Label>
          <p className="mb-2 text-xs" style={{ color: "#3a3a3a" }}>
            Legg til opptil 3 spørsmål kunden må svare på ved bestilling
          </p>
          <div className="flex flex-col gap-2 mb-3">
            {customQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background: "#141414", border: "1px solid #2a2a2a" }}>
                <span className="flex-1 text-sm" style={{ color: "#f5f5f7" }}>{q}</span>
                <button type="button" onClick={() => setCustomQuestions((prev) => prev.filter((_, j) => j !== i))}
                  style={{ color: "#86868b" }}>
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
          {customQuestions.length < 3 && (
            <div className="flex gap-2">
              <input type="text" placeholder="Ditt spørsmål..."
                value={customQInput} onChange={(e) => setCustomQInput(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); addQuestion(); } }}
                style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={addQuestion}
                className="rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)", whiteSpace: "nowrap" }}>
                Legg til
              </button>
            </div>
          )}
        </div>

        {/* Vilkår */}
        <div className="flex flex-col gap-3 rounded-2xl p-5" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
          <CheckboxRow checked={acceptNoReject} onChange={setAcceptNoReject}>
            Jeg bekrefter at jeg ikke kan avslå bestillinger etter at tjenesten er publisert og en søknad er godkjent
          </CheckboxRow>
          <CheckboxRow checked={acceptTerms} onChange={setAcceptTerms}>
            Jeg har lest og godtar <Link href="/vilkar" className="underline" style={{ color: "#818cf8" }}>plattformvilkårene</Link>, inkludert at Russeartister.no beholder 20% av hvert salg
          </CheckboxRow>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.18)" }}>
          <AlertCircle size={16} style={{ color: "#ff3b30", flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs leading-relaxed" style={{ color: "#86868b" }}>
            Last opp riktig informasjon og lever det du lover. Svindel eller manglende levering vil føre til utestengelse og stopp av utbetalinger.
          </p>
        </div>

        {error && <p className="text-sm" style={{ color: "#ff453a" }}>{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={submitting || stripeReady === null}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "#0071e3", color: "#fff" }}>
            {submitting ? "Publiserer..." : "Publiser tjeneste"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="rounded-xl px-4 py-2.5 text-sm transition-opacity hover:opacity-80"
            style={{ color: "#86868b" }}>
            Avbryt
          </button>
        </div>
      </form>

      {cropSrc && (
        <ImageCropModal imageSrc={cropSrc} aspect={1}
          onCancel={() => { setCropSrc(null); if (coverInputRef.current) coverInputRef.current.value = ""; }}
          onCrop={(blob) => {
            const file = new File([blob], "cover.webp", { type: "image/webp" });
            setCover({ file, previewUrl: URL.createObjectURL(blob) });
            setCropSrc(null);
            if (coverInputRef.current) coverInputRef.current.value = "";
          }} />
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-medium" style={{ color: "#86868b" }}>{children}</p>;
}

function CheckboxRow({ checked, onChange, children }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className="shrink-0 rounded-md flex items-center justify-center transition-all mt-0.5"
        style={{
          width: 18, height: 18,
          background: checked ? "#0071e3" : "#141414",
          border: `1px solid ${checked ? "#0071e3" : "#2a2a2a"}`,
        }}
      >
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>}
      </div>
      <span className="text-xs leading-relaxed" style={{ color: "#86868b" }}>{children}</span>
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2a2a2a",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 13,
  color: "#f5f5f7",
  outline: "none",
  width: "100%",
};
