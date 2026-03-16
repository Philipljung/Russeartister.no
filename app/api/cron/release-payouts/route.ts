import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { stripe, nokToOre } from "@/lib/stripe";
import { sendBatch, buildPayoutReleasedEmail } from "@/lib/email";

const PLATFORM_FEE_PERCENT = 0.15;

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (or a trusted source)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find all purchases older than 24h with no complaint and no payout yet
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: purchases, error } = await supabase
    .from("purchases")
    .select(`
      id, order_number, amount_paid, producer_id, item_type,
      beat:beats(title),
      remake:remakes(title),
      sample:samples(title)
    `)
    .is("payout_released_at", null)
    .is("complaint_filed_at", null)
    .lt("created_at", cutoff);

  if (error) {
    console.error("[cron/release-payouts] Query failed:", error.message);
    return NextResponse.json({ error: "DB query failed" }, { status: 500 });
  }

  if (!purchases || purchases.length === 0) {
    console.log("[cron/release-payouts] No payouts due.");
    return NextResponse.json({ released: 0 });
  }

  console.log(`[cron/release-payouts] Processing ${purchases.length} payout(s)`);

  let released = 0;
  let failed = 0;
  const emailPayloads = [];

  for (const purchase of purchases) {
    if (!purchase.producer_id) {
      console.warn("[cron/release-payouts] No producer_id on purchase:", purchase.id);
      continue;
    }

    // Look up producer's Stripe account ID and email
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", purchase.producer_id)
      .single();

    if (!profile?.stripe_account_id) {
      console.warn("[cron/release-payouts] No Stripe account for producer:", purchase.producer_id);
      continue;
    }

    const payoutNok = Math.round(purchase.amount_paid * (1 - PLATFORM_FEE_PERCENT));
    const payoutOre = nokToOre(payoutNok);

    const itemTitle =
      (purchase.beat as { title: string } | null)?.title ??
      (purchase.remake as { title: string } | null)?.title ??
      (purchase.sample as { title: string } | null)?.title ??
      "Ukjent";

    try {
      await stripe.transfers.create({
        amount: payoutOre,
        currency: "nok",
        destination: profile.stripe_account_id,
        transfer_group: purchase.order_number ?? purchase.id,
        metadata: {
          purchase_id: purchase.id,
          order_number: purchase.order_number ?? "",
        },
      });

      await supabase
        .from("purchases")
        .update({ payout_released_at: new Date().toISOString() })
        .eq("id", purchase.id);

      released++;
      console.log(`[cron/release-payouts] Released ${payoutNok} NOK for ${purchase.order_number} (${itemTitle})`);

      // Queue email to producer
      const { data: { user: producerUser } } = await supabase.auth.admin.getUserById(purchase.producer_id);
      if (producerUser?.email) {
        emailPayloads.push(buildPayoutReleasedEmail({
          producerEmail: producerUser.email,
          orderNumber: purchase.order_number ?? purchase.id,
          itemTitle,
          payoutNok,
        }));
      }
    } catch (err) {
      failed++;
      console.error(`[cron/release-payouts] Transfer failed for purchase ${purchase.id}:`, err);
      // Do NOT set payout_released_at — cron will retry next hour
    }
  }

  // Send all payout emails in one batch
  if (emailPayloads.length > 0) {
    try {
      await sendBatch(emailPayloads);
    } catch (err) {
      console.error("[cron/release-payouts] Email batch failed:", err);
    }
  }

  console.log(`[cron/release-payouts] Done. Released: ${released}, Failed: ${failed}`);
  return NextResponse.json({ released, failed });
}
