import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/stripe/verify-session?session_id=<id>
 *
 * Verifies a Stripe Checkout Session and — if paid — returns beat info
 * plus a short-lived signed download URL for the project file.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id mangler" }, { status: 400 });
  }

  console.log("[verify-session] Verifying session:", sessionId);

  // 1. Retrieve session from Stripe
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error("[verify-session] Failed to retrieve session:", err);
    return NextResponse.json({ error: "Ugyldig session" }, { status: 400 });
  }

  if (session.payment_status !== "paid") {
    console.warn("[verify-session] Session not paid:", session.id, session.payment_status);
    return NextResponse.json({ error: "Betaling ikke fullført" }, { status: 402 });
  }

  const beatId = session.metadata?.beat_id;
  if (!beatId) {
    return NextResponse.json({ error: "Beat-metadata mangler" }, { status: 400 });
  }

  // 2. Fetch beat from DB
  const supabase = createServiceClient();
  const { data: beat, error: beatError } = await supabase
    .from("beats")
    .select("id, title, genre, bpm, key, cover_url, project_file_url, producer:profiles(display_name)")
    .eq("id", beatId)
    .single();

  if (beatError || !beat) {
    console.error("[verify-session] Beat not found:", beatError?.message);
    return NextResponse.json({ error: "Beat ikke funnet" }, { status: 404 });
  }

  // 3. Generate signed download URL (valid 1 hour)
  let downloadUrl: string | null = null;
  if (beat.project_file_url) {
    const { data: signed, error: signError } = await supabase.storage
      .from("beat-files")
      .createSignedUrl(beat.project_file_url, 60 * 60); // 1 hour

    if (signError) {
      console.error("[verify-session] Failed to create signed URL:", signError.message);
    } else {
      downloadUrl = signed.signedUrl;
    }
  }

  const producer = beat.producer as unknown as { display_name: string } | null;

  console.log("[verify-session] Verified — beat:", beat.title, "download:", !!downloadUrl);

  return NextResponse.json({
    beat: {
      id: beat.id,
      title: beat.title,
      genre: beat.genre,
      bpm: beat.bpm,
      key: beat.key,
      cover_url: beat.cover_url,
      producer_name: producer?.display_name ?? "Ukjent",
    },
    customerEmail: session.customer_details?.email ?? null,
    downloadUrl,
  });
}
