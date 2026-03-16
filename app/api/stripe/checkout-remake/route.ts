import { NextRequest, NextResponse } from "next/server";
import { stripe, nokToOre } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { remakeId } = body;

    if (!remakeId) {
      return NextResponse.json({ error: "remakeId mangler" }, { status: 400 });
    }

    const { data: remake, error: remakeError } = await supabase
      .from("remakes")
      .select("*, producer:profiles(stripe_account_id, stripe_onboarding_complete, display_name)")
      .eq("id", remakeId)
      .eq("is_published", true)
      .single();

    if (remakeError || !remake) {
      return NextResponse.json({ error: "Remake ikke funnet" }, { status: 404 });
    }

    const producer = remake.producer as {
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

    const amountOre = nokToOre(remake.price);

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
              name: remake.title,
              description: `Remake av "${remake.original_song}" · ${producer.display_name} · ${remake.genre} · ${remake.bpm} BPM`,
              ...(remake.cover_url ? { images: [remake.cover_url] } : {}),
            },
            unit_amount: amountOre,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        remake_id: remakeId,
        remake_title: remake.title,
      },
      ...(buyerId ? { client_reference_id: buyerId } : {}),
      return_url: `${appUrl}/kjop/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({ clientSecret: checkoutSession.client_secret });
  } catch (err) {
    console.error("[checkout-remake] Unexpected error:", err);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
