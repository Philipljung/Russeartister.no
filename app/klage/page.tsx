"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Upload, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function KlagePage() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const order = searchParams.get("order");
    if (order) setOrderNumber(order);
    getSupabaseClient().auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
    });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!orderNumber.trim()) { setError("Oppgi ordrenummer."); return; }
    if (!description.trim()) { setError("Beskriv hva som gikk galt."); return; }
    if (!file) { setError("Du må legge ved filen du mottok."); return; }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("orderNumber", orderNumber.trim());
    formData.append("description", description.trim());
    if (file) formData.append("file", file);

    const res = await fetch("/api/klage", { method: "POST", body: formData });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Noe gikk galt. Prøv igjen.");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <CheckCircle size={36} style={{ color: "#34d399", margin: "0 auto 16px" }} />
        <h1 className="mb-2 text-xl font-bold" style={{ color: "#f5f5f7" }}>Klage mottatt</h1>
        <p className="text-sm" style={{ color: "#86868b" }}>
          Vi har registrert klagen din for bestilling <strong style={{ color: "#f5f5f7" }}>{orderNumber}</strong>.
          Du vil motta en bekreftelse på e-post, og vi vil undersøke saken så snart som mulig.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="mb-1 text-2xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>
        Send klage
      </h1>
      <p className="mb-8 text-sm" style={{ color: "#86868b" }}>
        Fikk du ikke det du kjøpte, eller var filen ødelagt? Fyll ut skjemaet under.
      </p>

      {!authed && authed !== null && (
        <div
          className="mb-6 flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.2)" }}
        >
          <AlertCircle size={15} style={{ color: "#ff9500", flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs" style={{ color: "#86868b" }}>
            Du er ikke innlogget. Vi vil fortsatt behandle klagen din, men det kan ta lengre tid å verifisere kjøpet.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Order number */}
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#86868b" }}>
            Ordrenummer *
          </label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="RA-XXXXX"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
            style={{
              background: "#141414",
              border: "1px solid #2a2a2a",
              color: "#f5f5f7",
            }}
          />
          <p className="mt-1 text-xs" style={{ color: "#3a3a3a" }}>
            Finner du i kvitteringse-posten eller under Mine nedlastninger.
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#86868b" }}>
            Beskriv problemet *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Hva gikk galt? Hva forventet du å motta, og hva mottok du?"
            className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition-colors"
            style={{
              background: "#141414",
              border: "1px solid #2a2a2a",
              color: "#f5f5f7",
            }}
          />
        </div>

        {/* File attachment */}
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#86868b" }}>
            Legg ved filen du mottok *
          </label>
          {file ? (
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: "#141414", border: "1px solid #2a2a2a" }}
            >
              <span className="text-sm truncate" style={{ color: "#f5f5f7" }}>{file.name}</span>
              <button
                type="button"
                onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="ml-3 shrink-0 transition-opacity hover:opacity-70"
                style={{ color: "#86868b" }}
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm transition-opacity hover:opacity-80"
              style={{
                background: "#141414",
                border: "1px dashed #2a2a2a",
                color: "#86868b",
              }}
            >
              <Upload size={14} />
              Velg fil
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs" style={{ color: "#3a3a3a" }}>
            Maks 50 MB. Legg ved filen du lastet ned slik vi kan verifisere innholdet.
          </p>
        </div>

        {error && (
          <div
            className="flex items-start gap-2 rounded-xl px-4 py-3"
            style={{ background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.18)" }}
          >
            <AlertCircle size={14} style={{ color: "#ff3b30", flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: "#ff3b30" }}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "#f5f5f7", color: "#080808" }}
        >
          {submitting ? "Sender..." : "Send klage"}
        </button>
      </form>
    </div>
  );
}
