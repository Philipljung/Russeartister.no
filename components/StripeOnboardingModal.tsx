"use client";

import { useEffect, useRef, useState } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import { X, CreditCard, ShieldCheck, Banknote, FileText } from "lucide-react";

type Props = {
  onClose: () => void;
  onComplete: () => void;
};

async function fetchClientSecret(country: string): Promise<string> {
  const res = await fetch("/api/stripe/account-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("[StripeOnboarding] Failed to get client_secret:", data.error);
    throw new Error(data.error ?? "Kunne ikke starte Stripe-oppsett");
  }
  return data.client_secret;
}

const COUNTRIES = [
  { code: "NO", label: "Norge" },
  { code: "GB", label: "United Kingdom" },
  { code: "SE", label: "Sverige" },
  { code: "DK", label: "Danmark" },
  { code: "FI", label: "Finland" },
  { code: "DE", label: "Deutschland" },
  { code: "FR", label: "France" },
  { code: "NL", label: "Nederland" },
  { code: "BE", label: "Belgia" },
  { code: "AT", label: "Østerrike" },
  { code: "IE", label: "Irland" },
  { code: "ES", label: "España" },
  { code: "IT", label: "Italia" },
  { code: "PT", label: "Portugal" },
  { code: "PL", label: "Polen" },
  { code: "CH", label: "Sveits" },
  { code: "US", label: "United States" },
  { code: "AU", label: "Australia" },
  { code: "CA", label: "Canada" },
  { code: "NZ", label: "New Zealand" },
];

export default function StripeOnboardingModal({ onClose, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<"intro" | "form">("intro");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState("NO");

  // Mount the Stripe embedded component when the user moves to "form" step
  useEffect(() => {
    if (step !== "form" || !containerRef.current) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    const selectedCountry = country;
    const instance = loadConnectAndInitialize({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      fetchClientSecret: () => fetchClientSecret(selectedCountry),
      appearance: {
        overlays: "drawer",
        variables: {
          colorPrimary: "#6366f1",
          colorBackground: "#111111",
          colorText: "#f5f5f7",
          colorDanger: "#ff3b30",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          borderRadius: "12px",
          spacingUnit: "10px",
        },
      },
      locale: "nb-NO",
    });

    const onboarding = instance.create("account-onboarding");

    onboarding.setOnLoaderStart(() => {
      if (mounted) setLoading(false);
    });

    onboarding.setOnExit(() => {
      if (mounted) onClose();
    });

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(onboarding);
    }

    return () => {
      mounted = false;
    };
  }, [step, onClose]);

  // Intercept backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full overflow-hidden rounded-3xl"
        style={{
          maxWidth: step === "form" ? 720 : 520,
          background: "#111",
          border: "1px solid #222",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 flex items-center justify-center rounded-full transition-colors hover:opacity-70"
          style={{ width: 32, height: 32, background: "rgba(255,255,255,0.06)", color: "#86868b" }}
        >
          <X size={16} />
        </button>

        {/* ── INTRO STEP ── */}
        {step === "intro" && (
          <div className="px-8 py-10">
            {/* Header */}
            <div className="mb-8">
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
              >
                <CreditCard size={22} style={{ color: "#6366f1" }} />
              </div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>
                Sett opp betalinger
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#86868b" }}>
                For å motta betaling for beats bruker vi <strong style={{ color: "#f5f5f7" }}>Stripe</strong> —
                en trygg betalingsløsning brukt av millioner av selgere verden over.
                Vi tar <strong style={{ color: "#f5f5f7" }}>15&thinsp;%</strong> i plattformavgift, og resten går direkte til deg.
              </p>
            </div>

            {/* Country selector */}
            <div className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#3a3a3a" }}>
                Hvilket land bor du i?
              </p>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{
                  background: "#141414",
                  border: "1px solid #2a2a2a",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#f5f5f7",
                  outline: "none",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Warning */}
            <div
              className="mb-6 rounded-2xl px-4 py-3.5"
              style={{ background: "rgba(255,179,0,0.06)", border: "1px solid rgba(255,179,0,0.15)" }}
            >
              <p className="text-sm font-medium" style={{ color: "#ffb300" }}>Ha BankID klar</p>
              <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "#86868b" }}>
                Stripe krever at du verifiserer identiteten din med BankID eller pass under oppsett.
                Ha dette klart for deg slik at du slipper å avbryte underveis.
              </p>
            </div>

            {/* What you'll need */}
            <div className="mb-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#3a3a3a" }}>
                Du trenger
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  { icon: FileText, text: "Fødselsnummer eller organisasjonsnummer" },
                  { icon: Banknote, text: "Norsk bankkontonummer (til utbetaling)" },
                  { icon: ShieldCheck, text: "BankID for identitetsbekreftelse" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div
                      className="flex shrink-0 items-center justify-center rounded-lg"
                      style={{ width: 32, height: 32, background: "rgba(255,255,255,0.04)" }}
                    >
                      <Icon size={14} style={{ color: "#86868b" }} />
                    </div>
                    <p className="text-sm" style={{ color: "#86868b" }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Account type guidance */}
            <div
              className="mb-8 rounded-2xl px-4 py-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e1e1e" }}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#3a3a3a" }}>
                Hva skal du velge?
              </p>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>Privatperson / artist</p>
                  <p className="text-xs mt-0.5" style={{ color: "#86868b" }}>
                    Velg <em>Enkeltpersonforetak</em> eller <em>Privatperson</em> hvis du selger som deg selv.
                    Gjelder de fleste artister og produsenter.
                  </p>
                </div>
                <div
                  className="h-px w-full"
                  style={{ background: "#1e1e1e" }}
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>Selskap / AS</p>
                  <p className="text-xs mt-0.5" style={{ color: "#86868b" }}>
                    Velg <em>Selskap</em> og oppgi organisasjonsnummeret ditt hvis du har registrert et foretak.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => setStep("form")}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "#6366f1", color: "#fff" }}
            >
              Start oppsett
            </button>
            <p className="mt-3 text-center text-xs" style={{ color: "#3a3a3a" }}>
              Du sendes ikke noe sted — oppsett skjer her på siden
            </p>
          </div>
        )}

        {/* ── FORM STEP ── */}
        {step === "form" && (
          <div>
            {/* Header */}
            <div className="border-b px-8 py-6" style={{ borderColor: "#1e1e1e" }}>
              <h2 className="text-base font-semibold" style={{ color: "#f5f5f7" }}>
                Koble til Stripe
              </h2>
              <p className="mt-0.5 text-xs" style={{ color: "#86868b" }}>
                Fyll ut skjemaet nedenfor. Alt lagres trygt hos Stripe.
              </p>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm" style={{ color: "#3a3a3a" }}>Laster skjema...</p>
              </div>
            )}

            {error && (
              <div className="px-8 py-6">
                <p className="text-sm" style={{ color: "#ff3b30" }}>{error}</p>
                <button
                  onClick={() => { setStep("intro"); setError(null); }}
                  className="mt-4 text-sm underline"
                  style={{ color: "#86868b" }}
                >
                  Gå tilbake
                </button>
              </div>
            )}

            {/* Stripe Connect mounts here */}
            <div
              ref={containerRef}
              className="px-4 py-4"
              style={{ display: loading || error ? "none" : "block" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
