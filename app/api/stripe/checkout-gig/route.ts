import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId mangler" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/logg-inn", request.url));

  // Fetch order
  const { data: order, error } = await supabase
    .from("gig_orders")
    .select(`
      id, status, buyer_id, producer_id, price, platform_fee,
      gigs(title),
      gig_packages(label),
      producer:profiles!producer_id(stripe_account_id, stripe_onboarding_complete)
    `)
    .eq("id", orderId)
    .single();

  if (error || !order) return NextResponse.redirect(new URL("/meldinger", request.url));
  if (order.buyer_id !== user.id) return NextResponse.redirect(new URL("/meldinger", request.url));
  if (order.status !== "approved") return NextResponse.redirect(new URL(`/meldinger/${orderId}`, request.url));

  const producer = order.producer as any;
  if (!producer?.stripe_account_id || !producer?.stripe_onboarding_complete) {
    return NextResponse.redirect(new URL(`/meldinger/${orderId}`, request.url));
  }

  const gigTitle = (order.gigs as any)?.title ?? "Tjeneste";
  const pkgLabel = (order.gig_packages as any)?.label ?? "";
  const priceOre = order.price * 100; // NOK → øre
  const feeOre   = order.platform_fee * 100;

  const session = await stripe.checkout.sessions.create({
    mode:               "payment",
    currency:           "nok",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency:     "nok",
        unit_amount:  priceOre,
        product_data: { name: `${gigTitle}${pkgLabel ? ` — ${pkgLabel}` : ""}` },
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: feeOre,
      transfer_data: { destination: producer.stripe_account_id },
      metadata: { gig_order_id: orderId, type: "gig" },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/meldinger/${orderId}?paid=1`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/meldinger/${orderId}`,
    metadata:    { gig_order_id: orderId, type: "gig" },
  });

  // Store payment intent id
  if (session.payment_intent) {
    await supabase.from("gig_orders").update({
      stripe_payment_intent_id: String(session.payment_intent),
    }).eq("id", orderId);
  }

  return NextResponse.redirect(session.url!);
}
