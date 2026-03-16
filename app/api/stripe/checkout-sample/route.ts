import { NextRequest, NextResponse } from "next/server";
import { stripe, APPLICATION_FEE_PERCENT, nokToOre } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { sampleId } = body;

    if (!sampleId) {
      return NextResponse.json({ error: "sampleId mangler" }, { status: 400 });
    }

    const { data: sample, error: sampleError } = await supabase
      .from("samples")
      .select("*, producer:profiles(stripe_account_id, stripe_onboarding_complete, display_name)")
      .eq("id", sampleId)
      .eq("is_published", true)
      .single();

    if (sampleError || !sample) {
      return NextResponse.json({ error: "Sample ikke funnet" }, { status: 404 });
    }

    const producer = sample.producer as {
      stripe_account_id: string | null;
      stripe_onboarding_complete: boolean;
      display_name: string;
    };

    if (!producer?.stripe_account_id || !producer?.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: "Produsenten har ikke fullført Stripe-oppsett" },
        { status: 400 }
      );
    }

    const amountOre = nokToOre(sample.price);
    const feeOre = Math.round(amountOre * APPLICATION_FEE_PERCENT);

    const { data: { session: authSession } } = await supabase.auth.getSession();
    const buyerId = authSession?.user?.id ?? null;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    const checkoutSession = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "nok",
            product_data: {
              name: sample.title,
              description: `${producer.display_name} · ${sample.category}`,
              ...(sample.cover_url ? { images: [sample.cover_url] } : {}),
            },
            unit_amount: amountOre,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: feeOre,
        transfer_data: { destination: producer.stripe_account_id },
      },
      metadata: {
        sample_id: sampleId,
        sample_title: sample.title,
      },
      ...(buyerId ? { client_reference_id: buyerId } : {}),
      return_url: `${appUrl}/kjop/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({ clientSecret: checkoutSession.client_secret });
  } catch (err) {
    console.error("[checkout-sample] Unexpected error:", err);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
