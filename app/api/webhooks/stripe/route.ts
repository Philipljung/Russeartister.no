import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Mangler signatur" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const beatId = paymentIntent.metadata?.beat_id;

    if (!beatId) {
      return NextResponse.json({ error: "beat_id mangler i metadata" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Sjekk om kjøpet allerede er registrert (idempotency)
    const { data: existing } = await supabase
      .from("purchases")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .single();

    if (!existing) {
      const { error } = await supabase.from("purchases").insert({
        beat_id: beatId,
        buyer_id: null, // kobles til bruker via annen flyt hvis logget inn
        amount_paid: Math.round(paymentIntent.amount / 100), // øre → NOK
        stripe_payment_intent_id: paymentIntent.id,
      });

      if (error) {
        console.error("Feil ved lagring av kjøp:", error);
        return NextResponse.json({ error: "DB-feil" }, { status: 500 });
      }
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const isComplete =
      account.charges_enabled && account.payouts_enabled;

    if (isComplete) {
      const supabase = await createServiceClient();
      await supabase
        .from("profiles")
        .update({ stripe_onboarding_complete: true })
        .eq("stripe_account_id", account.id);
    }
  }

  return NextResponse.json({ received: true });
}
