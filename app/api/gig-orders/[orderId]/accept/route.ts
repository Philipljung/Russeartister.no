import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Uautorisert" }, { status: 401 });

  // Fetch order
  const { data: order, error: orderErr } = await supabase
    .from("gig_orders")
    .select("id, status, buyer_id, producer_id, artist_payout, stripe_payment_intent_id")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) return NextResponse.json({ error: "Ordre ikke funnet" }, { status: 404 });
  if (order.buyer_id !== user.id) return NextResponse.json({ error: "Kun kjøper kan akseptere" }, { status: 403 });
  if (order.status !== "delivered") return NextResponse.json({ error: "Ordre er ikke levert" }, { status: 400 });

  // Get producer Stripe account
  const { data: producer } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", order.producer_id)
    .single();

  if (!producer?.stripe_account_id) {
    return NextResponse.json({ error: "Artisten har ikke Stripe satt opp" }, { status: 400 });
  }

  try {
    // Transfer 80% to artist
    const transfer = await stripe.transfers.create({
      amount:      order.artist_payout * 100, // convert NOK to øre
      currency:    "nok",
      destination: producer.stripe_account_id,
      metadata:    { gig_order_id: orderId },
    });

    // Update order
    await supabase.from("gig_orders").update({
      status:            "completed",
      accepted_at:       new Date().toISOString(),
      stripe_transfer_id: transfer.id,
    }).eq("id", orderId);

    // Insert completion message
    await supabase.from("gig_messages").insert({
      order_id:  orderId,
      sender_id: user.id,
      content:   "✓ Levering akseptert. Oppdraget er fullført!",
    });

    // Notifications
    await supabase.from("notifications").insert([
      { user_id: order.producer_id, type: "accepted",  order_id: orderId },
      { user_id: order.buyer_id,    type: "completed", order_id: orderId },
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[gig-accept] Stripe transfer failed:", err.message);
    return NextResponse.json({ error: "Transfer feilet: " + err.message }, { status: 500 });
  }
}
