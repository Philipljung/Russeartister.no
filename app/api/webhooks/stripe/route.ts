import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  console.log("[webhook] POST /api/webhooks/stripe received");

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[webhook] Missing stripe-signature header");
    return NextResponse.json({ error: "Mangler signatur" }, { status: 400 });
  }

  // Use STRIPE_WEBHOOK_SECRET_LOCAL in dev if present (Stripe CLI forwarding)
  const webhookSecret =
    process.env.NODE_ENV === "development" && process.env.STRIPE_WEBHOOK_SECRET_LOCAL
      ? process.env.STRIPE_WEBHOOK_SECRET_LOCAL
      : process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("[webhook] Event verified:", event.type, event.id);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 400 });
  }

  // ── checkout.session.completed ──────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log(
      "[webhook] checkout.session.completed:",
      session.id,
      "payment_status:",
      session.payment_status
    );

    // Only process if payment was collected (not e.g. free or pending)
    if (session.payment_status !== "paid") {
      console.warn("[webhook] Session not paid yet, skipping:", session.id);
      return NextResponse.json({ received: true });
    }

    const beatId = session.metadata?.beat_id;
    if (!beatId) {
      console.error("[webhook] beat_id missing in session metadata:", session.id);
      return NextResponse.json({ error: "beat_id mangler" }, { status: 400 });
    }

    // buyer_id is set if the user was logged in when they checked out
    const buyerId: string | null = session.client_reference_id ?? null;
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;
    const amountNok = session.amount_total ? Math.round(session.amount_total / 100) : 0;

    console.log(
      "[webhook] Saving purchase — beat_id:", beatId,
      "buyer_id:", buyerId ?? "anonymous",
      "payment_intent:", paymentIntentId,
      "amount:", amountNok, "NOK"
    );

    try {
      const supabase = createServiceClient();

      // Idempotency: skip if we already recorded this payment
      if (paymentIntentId) {
        const { data: existing } = await supabase
          .from("purchases")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();

        if (existing) {
          console.log("[webhook] Purchase already recorded, skipping:", paymentIntentId);
          return NextResponse.json({ received: true });
        }
      }

      const { error: insertError } = await supabase.from("purchases").insert({
        beat_id: beatId,
        buyer_id: buyerId,
        amount_paid: amountNok,
        stripe_payment_intent_id: paymentIntentId,
      });

      if (insertError) {
        console.error("[webhook] Failed to insert purchase:", insertError.message);
        return NextResponse.json({ error: "DB-feil" }, { status: 500 });
      }

      console.log("[webhook] Purchase saved successfully for beat:", beatId);
    } catch (err) {
      console.error("[webhook] Unexpected DB error:", err);
      return NextResponse.json({ error: "Intern feil" }, { status: 500 });
    }
  }

  // ── account.updated — mark Stripe onboarding complete ──────────────────────
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const isComplete = account.charges_enabled && account.payouts_enabled;

    console.log(
      "[webhook] account.updated:", account.id,
      "charges_enabled:", account.charges_enabled,
      "payouts_enabled:", account.payouts_enabled
    );

    if (isComplete) {
      try {
        const supabase = createServiceClient();
        const { error } = await supabase
          .from("profiles")
          .update({ stripe_onboarding_complete: true })
          .eq("stripe_account_id", account.id);

        if (error) {
          console.error("[webhook] Failed to update stripe_onboarding_complete:", error.message);
        } else {
          console.log("[webhook] Marked stripe_onboarding_complete for account:", account.id);
        }
      } catch (err) {
        console.error("[webhook] Unexpected error updating profile:", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
