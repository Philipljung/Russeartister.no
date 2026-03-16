import { NextRequest, NextResponse } from "next/server";
import { stripe, nokToOre } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  console.log("[checkout] POST /api/stripe/checkout called");

  try {
    const supabase = await createClient();

    const body = await request.json();
    const { beatId, exclusive = false } = body;

    if (!beatId) {
      console.error("[checkout] beatId missing in request body");
      return NextResponse.json({ error: "beatId mangler" }, { status: 400 });
    }

    console.log("[checkout] Fetching beat:", beatId, "exclusive:", exclusive);

    // Fetch beat + producer's Stripe account
    const { data: beat, error: beatError } = await supabase
      .from("beats")
      .select("*, producer:profiles(stripe_account_id, stripe_onboarding_complete, display_name)")
      .eq("id", beatId)
      .eq("is_published", true)
      .eq("exclusively_sold", false)
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

    // Exclusive: server-side eligibility check
    if (exclusive) {
      if (!beat.exclusive_price) {
        return NextResponse.json({ error: "Eksklusiv lisens ikke tilgjengelig" }, { status: 400 });
      }
      const { count } = await supabase
        .from("purchases")
        .select("id", { count: "exact", head: true })
        .eq("beat_id", beatId);
      if ((count ?? 0) > 0) {
        return NextResponse.json({ error: "Eksklusiv lisens ikke lenger tilgjengelig — noen har allerede kjøpt dette beatet" }, { status: 409 });
      }
    }

    const priceToUse = exclusive ? beat.exclusive_price! : beat.price;
    const amountOre = nokToOre(priceToUse);

    console.log(
      "[checkout] Creating Checkout Session for beat:",
      beat.title,
      exclusive ? "(EXCLUSIVE)" : "",
      "price:",
      amountOre,
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
      ui_mode: "embedded",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "nok",
            product_data: {
              name: exclusive ? `${beat.title} (Eksklusiv lisens)` : beat.title,
              description: exclusive
                ? `Eksklusiv lisens — ${producer.display_name} · ${beat.genre} · ${beat.bpm} BPM`
                : `${producer.display_name} · ${beat.genre} · ${beat.bpm} BPM`,
              ...(beat.cover_url ? { images: [beat.cover_url] } : {}),
            },
            unit_amount: amountOre,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        beat_id: beatId,
        beat_title: beat.title,
        exclusive: exclusive ? "true" : "false",
      },
      ...(buyerId ? { client_reference_id: buyerId } : {}),
      return_url: `${appUrl}/kjop/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    console.log("[checkout] Embedded Checkout Session created:", checkoutSession.id);

    return NextResponse.json({ clientSecret: checkoutSession.client_secret });
  } catch (err) {
    console.error("[checkout] Unexpected error:", err);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
