import { NextRequest, NextResponse } from "next/server";
import { stripe, nokToOre } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import {
  sendBatch,
  buildPurchaseReceiptEmail,
  buildProducerSaleEmail,
  buildAdminSaleEmail,
} from "@/lib/email";
import Stripe from "stripe";

const PLATFORM_FEE_PERCENT = 0.15;

/** Transfer producer's share immediately using source_transaction so Stripe queues it on settlement. */
async function transferToProducer(
  paymentIntentId: string,
  amountNok: number,
  stripeAccountId: string,
  orderNumber: string
) {
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    const chargeId =
      typeof pi.latest_charge === "string"
        ? pi.latest_charge
        : (pi.latest_charge as Stripe.Charge | null)?.id ?? null;

    const payoutOre = nokToOre(Math.round(amountNok * (1 - PLATFORM_FEE_PERCENT)));

    await stripe.transfers.create({
      amount: payoutOre,
      currency: "nok",
      destination: stripeAccountId,
      transfer_group: orderNumber,
      ...(chargeId ? { source_transaction: chargeId } : {}),
      metadata: { order_number: orderNumber },
    });

    console.log(`[webhook] Transfer of ${payoutOre} øre queued for ${orderNumber}`);
  } catch (err) {
    console.error(`[webhook] Transfer failed for ${orderNumber}:`, err);
  }
}

function generateOrderNumber(): string {
  return "RA-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

/** Resolve a stored file path into a signed URL (handles both raw paths and full https URLs). */
async function makeSignedUrl(
  supabase: ReturnType<typeof createServiceClient>,
  rawPath: string | null,
  filename: string,
  expiresIn = 60 * 60 * 24 * 7 // 7 days
): Promise<string | null> {
  if (!rawPath) return null;
  const filePath = rawPath.startsWith("http")
    ? rawPath.split("/beat-files/")[1]?.split("?")[0]
    : rawPath;
  if (!filePath) return null;
  const { data } = await supabase.storage
    .from("beat-files")
    .createSignedUrl(filePath, expiresIn, { download: filename });
  return data?.signedUrl ?? null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Mangler signatur" }, { status: 400 });
  }

  const webhookSecret =
    process.env.NODE_ENV === "development" && process.env.STRIPE_WEBHOOK_SECRET_LOCAL
      ? process.env.STRIPE_WEBHOOK_SECRET_LOCAL
      : process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 400 });
  }

  // ── checkout.session.completed ──────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const beatId = session.metadata?.beat_id ?? null;
    const remakeId = session.metadata?.remake_id ?? null;
    const sampleId = session.metadata?.sample_id ?? null;
    const isExclusive = session.metadata?.exclusive === "true";

    if (!beatId && !remakeId && !sampleId) {
      console.error("[webhook] No beat_id, remake_id, or sample_id in metadata:", session.id);
      return NextResponse.json({ error: "Metadata mangler" }, { status: 400 });
    }

    const buyerId: string | null = session.client_reference_id ?? null;
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;
    const customerEmail = session.customer_details?.email ?? null;
    const amountNok = session.amount_total ? Math.round(session.amount_total / 100) : 0;
    const platformFeeNok = Math.round(amountNok * PLATFORM_FEE_PERCENT);

    const supabase = createServiceClient();

    // Idempotency: skip duplicate events
    if (paymentIntentId) {
      const { data: existing } = await supabase
        .from("purchases")
        .select("id")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle();
      if (existing) {
        console.log("[webhook] Purchase already recorded, skipping:", paymentIntentId);
        return NextResponse.json({ received: true });
      }
    }

    const orderNumber = generateOrderNumber();
    let itemTitle = "";
    let producerName = "";
    let producerEmail: string | null = null;
    let fileRawPath: string | null = null;
    let itemType: "beat" | "remake" | "sample" = "beat";

    // ── Beat path ──
    if (beatId) {
      itemType = "beat";

      if (isExclusive) {
        await supabase.from("beats").update({ exclusively_sold: true }).eq("id", beatId);
      }

      const { data: beat } = await supabase
        .from("beats")
        .select("title, project_file_url, producer_id, producer:profiles(display_name, stripe_account_id)")
        .eq("id", beatId)
        .single();

      if (!beat) {
        console.error("[webhook] Beat not found:", beatId);
        return NextResponse.json({ error: "Beat ikke funnet" }, { status: 404 });
      }

      const producer = beat.producer as unknown as { display_name: string; stripe_account_id: string | null } | null;
      itemTitle = beat.title;
      producerName = producer?.display_name ?? "Ukjent";
      fileRawPath = beat.project_file_url;

      // Get producer email from auth.users
      if (beat.producer_id) {
        const { data: { user: producerUser } } = await supabase.auth.admin.getUserById(beat.producer_id);
        producerEmail = producerUser?.email ?? null;
      }

      const { error: insertBeatError } = await supabase.from("purchases").insert({
        beat_id: beatId,
        item_type: "beat",
        buyer_id: buyerId,
        producer_id: beat.producer_id,
        amount_paid: amountNok,
        stripe_payment_intent_id: paymentIntentId,
        order_number: orderNumber,
        customer_email: customerEmail,
      });
      if (insertBeatError) console.error("[webhook] Beat purchase insert failed:", insertBeatError.message);
      else console.log("[webhook] Beat purchase recorded:", orderNumber);

      if (paymentIntentId && producer?.stripe_account_id) {
        await transferToProducer(paymentIntentId, amountNok, producer.stripe_account_id, orderNumber);
      }
    }

    // ── Remake path ──
    if (remakeId) {
      itemType = "remake";

      const { data: remake } = await supabase
        .from("remakes")
        .select("title, file_url, producer_id, producer:profiles(display_name, stripe_account_id)")
        .eq("id", remakeId)
        .single();

      if (!remake) {
        console.error("[webhook] Remake not found:", remakeId);
        return NextResponse.json({ error: "Remake ikke funnet" }, { status: 404 });
      }

      const producer = remake.producer as unknown as { display_name: string; stripe_account_id: string | null } | null;
      itemTitle = remake.title;
      producerName = producer?.display_name ?? "Ukjent";
      fileRawPath = remake.file_url;

      // Get producer email from auth.users
      if (remake.producer_id) {
        const { data: { user: producerUser } } = await supabase.auth.admin.getUserById(remake.producer_id);
        producerEmail = producerUser?.email ?? null;
      }

      const { error: insertRemakeError } = await supabase.from("purchases").insert({
        remake_id: remakeId,
        item_type: "remake",
        buyer_id: buyerId,
        producer_id: remake.producer_id,
        amount_paid: amountNok,
        stripe_payment_intent_id: paymentIntentId,
        order_number: orderNumber,
        customer_email: customerEmail,
      });
      if (insertRemakeError) console.error("[webhook] Remake purchase insert failed:", insertRemakeError.message);
      else console.log("[webhook] Remake purchase recorded:", orderNumber);

      if (paymentIntentId && producer?.stripe_account_id) {
        await transferToProducer(paymentIntentId, amountNok, producer.stripe_account_id, orderNumber);
      }
    }

    // ── Sample path ──
    if (sampleId) {
      itemType = "sample";

      const { data: sample } = await supabase
        .from("samples")
        .select("title, file_url, producer_id, producer:profiles(display_name, stripe_account_id)")
        .eq("id", sampleId)
        .single();

      if (!sample) {
        console.error("[webhook] Sample not found:", sampleId);
        return NextResponse.json({ error: "Sample ikke funnet" }, { status: 404 });
      }

      const producer = sample.producer as unknown as { display_name: string; stripe_account_id: string | null } | null;
      itemTitle = sample.title;
      producerName = producer?.display_name ?? "Ukjent";
      fileRawPath = sample.file_url;

      if (sample.producer_id) {
        const { data: { user: producerUser } } = await supabase.auth.admin.getUserById(sample.producer_id);
        producerEmail = producerUser?.email ?? null;
      }

      const { error: insertSampleError } = await supabase.from("purchases").insert({
        sample_id: sampleId,
        item_type: "sample",
        buyer_id: buyerId,
        producer_id: sample.producer_id,
        amount_paid: amountNok,
        stripe_payment_intent_id: paymentIntentId,
        order_number: orderNumber,
        customer_email: customerEmail,
      });
      if (insertSampleError) console.error("[webhook] Sample purchase insert failed:", insertSampleError.message);
      else console.log("[webhook] Sample purchase recorded:", orderNumber);

      if (paymentIntentId && producer?.stripe_account_id) {
        await transferToProducer(paymentIntentId, amountNok, producer.stripe_account_id, orderNumber);
      }
    }

    // ── Send emails ──
    // Build download filename with extension extracted from the stored path
    const _ext = fileRawPath?.split(".").pop();
    const downloadFilename = _ext && _ext.length <= 8 ? `${itemTitle}.${_ext}` : itemTitle;
    const downloadUrl = await makeSignedUrl(supabase, fileRawPath, downloadFilename, 60 * 60 * 24 * 7);

    const emails = [];
    if (customerEmail) {
      emails.push(buildPurchaseReceiptEmail({
        orderNumber, itemTitle, producerName, itemType, amountNok, customerEmail,
        downloadUrl: downloadUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/nedlastninger`,
        fileSignedUrl: downloadUrl ?? "",
      }));
    }
    if (producerEmail) {
      emails.push(buildProducerSaleEmail({ producerEmail, orderNumber, itemTitle, itemType, amountNok, platformFeeNok }));
    }
    emails.push(buildAdminSaleEmail({
      orderNumber, itemTitle, itemType, producerName,
      customerEmail: customerEmail ?? "Anonym",
      amountNok, fileSignedUrl: downloadUrl ?? "",
    }));

    console.log("[webhook] Sending batch of", emails.length, "emails");
    try {
      await sendBatch(emails);
      console.log("[webhook] Batch sent ok. Purchase recorded:", orderNumber);
    } catch (err) {
      console.error("[webhook] Batch email failed:", err);
    }
  }

  // ── account.updated — mark Stripe onboarding complete ──────────────────────
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const isComplete = account.charges_enabled && account.payouts_enabled;

    if (isComplete) {
      const supabase = createServiceClient();
      await supabase
        .from("profiles")
        .update({ stripe_onboarding_complete: true })
        .eq("stripe_account_id", account.id);
    }
  }

  return NextResponse.json({ received: true });
}
