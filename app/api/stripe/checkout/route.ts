import { NextRequest, NextResponse } from "next/server";
import { stripe, APPLICATION_FEE_PERCENT, nokToOre } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { beatId } = await request.json();

  if (!beatId) {
    return NextResponse.json({ error: "beatId mangler" }, { status: 400 });
  }

  // Hent beat + produsentens Stripe-konto
  const { data: beat, error: beatError } = await supabase
    .from("beats")
    .select("*, producer:profiles(stripe_account_id, stripe_onboarding_complete)")
    .eq("id", beatId)
    .eq("is_published", true)
    .single();

  if (beatError || !beat) {
    return NextResponse.json({ error: "Beat ikke funnet" }, { status: 404 });
  }

  const producer = beat.producer as {
    stripe_account_id: string | null;
    stripe_onboarding_complete: boolean;
  };

  if (!producer?.stripe_account_id || !producer?.stripe_onboarding_complete) {
    return NextResponse.json(
      { error: "Produsenten har ikke fullført Stripe-oppsett" },
      { status: 400 }
    );
  }

  const amountOre = nokToOre(beat.price);
  const feeOre = Math.round(amountOre * APPLICATION_FEE_PERCENT);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountOre,
    currency: "nok",
    application_fee_amount: feeOre,
    transfer_data: {
      destination: producer.stripe_account_id,
    },
    metadata: {
      beat_id: beatId,
      beat_title: beat.title,
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
