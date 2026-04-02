import { NextRequest, NextResponse } from "next/server";
import { stripe, nokToOre } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { packId } = body;

    if (!packId) {
      return NextResponse.json({ error: "packId mangler" }, { status: 400 });
    }

    const { data: pack, error: packError } = await supabase
      .from("packs")
      .select("*, producer:profiles(stripe_account_id, stripe_onboarding_complete, display_name)")
      .eq("id", packId)
      .eq("is_published", true)
      .single();

    if (packError || !pack) {
      return NextResponse.json({ error: "Pakke ikke funnet" }, { status: 404 });
    }

    const producer = pack.producer as {
      stripe_account_id: string | null;
      stripe_onboarding_complete: boolean;
      display_name: string;
    };

    if (!producer?.stripe_account_id || !producer?.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: "Produsenten har ikke fullfort Stripe-oppsett" },
        { status: 400 }
      );
    }

    const amountOre = nokToOre(pack.price);

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
              name: pack.title,
              description: `${producer.display_name} · Pakke`,
              ...(pack.cover_url ? { images: [pack.cover_url] } : {}),
            },
            unit_amount: amountOre,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        pack_id: packId,
        pack_title: pack.title,
      },
      ...(buyerId ? { client_reference_id: buyerId } : {}),
      return_url: `${appUrl}/kjop/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({ clientSecret: checkoutSession.client_secret });
  } catch (err) {
    console.error("[checkout-pack] Unexpected error:", err);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
