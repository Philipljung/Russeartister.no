import { NextRequest, NextResponse } from "next/server";
import { stripe, APPLICATION_FEE_PERCENT, nokToOre } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  console.log("[checkout] POST /api/stripe/checkout called");

  try {
    const supabase = await createClient();

    const body = await request.json();
    const { beatId } = body;

    if (!beatId) {
      console.error("[checkout] beatId missing in request body");
      return NextResponse.json({ error: "beatId mangler" }, { status: 400 });
    }

    console.log("[checkout] Fetching beat:", beatId);

    // Fetch beat + producer's Stripe account
    const { data: beat, error: beatError } = await supabase
      .from("beats")
      .select("*, producer:profiles(stripe_account_id, stripe_onboarding_complete, display_name)")
      .eq("id", beatId)
      .eq("is_published", true)
      .single();

    if (beatError || !beat) {
      console.error("[checkout] Beat not found:", beatError?.message);
      return NextResponse.json({ error: "Beat ikke funnet" }, { status: 404 });
    }

    const producer = beat.producer as {
      stripe_account_id: string | null;
      stripe_onboarding_complete: boolean;
      display_name: string;
    };

    if (!producer?.stripe_account_id || !producer?.stripe_onboarding_complete) {
      console.error("[checkout] Producer Stripe not set up:", beat.id);
      return NextResponse.json(
        { error: "Produsenten har ikke fullført Stripe-oppsett" },
        { status: 400 }
      );
    }

    const amountOre = nokToOre(beat.price);
    const feeOre = Math.round(amountOre * APPLICATION_FEE_PERCENT);

    console.log(
      "[checkout] Creating Checkout Session for beat:",
      beat.title,
      "price:",
      amountOre,
      "øre, fee:",
      feeOre,
      "øre"
    );

    // Read session to optionally link buyer — uses cookie, no network call
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();

    const buyerId = authSession?.user?.id ?? null;
    console.log("[checkout] Buyer ID:", buyerId ?? "anonymous");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "nok",
            product_data: {
              name: beat.title,
              description: `${producer.display_name} · ${beat.genre} · ${beat.bpm} BPM`,
              ...(beat.cover_url ? { images: [beat.cover_url] } : {}),
            },
            unit_amount: amountOre,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: feeOre,
        transfer_data: {
          destination: producer.stripe_account_id,
        },
      },
      metadata: {
        beat_id: beatId,
        beat_title: beat.title,
      },
      // Pass buyer ID so the webhook can link the purchase to the user
      ...(buyerId ? { client_reference_id: buyerId } : {}),
      success_url: `${appUrl}/kjop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/kjop/avbryt`,
    });

    console.log("[checkout] Checkout Session created:", checkoutSession.id, "url:", checkoutSession.url);

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[checkout] Unexpected error:", err);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
