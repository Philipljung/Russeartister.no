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
  const remakeId = session.metadata?.remake_id;
  const sampleId = session.metadata?.sample_id;
  const packId = session.metadata?.pack_id;
  const isExclusive = session.metadata?.exclusive === "true";

  if (!beatId && !remakeId && !sampleId && !packId) {
    return NextResponse.json({ error: "Metadata mangler" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // --- Pack path ---
  if (packId) {
    const { data: pack, error: packError } = await supabase
      .from("packs")
      .select("id, title, cover_url, file_url, producer:profiles(display_name)")
      .eq("id", packId)
      .single();

    if (packError || !pack) {
      return NextResponse.json({ error: "Pakke ikke funnet" }, { status: 404 });
    }

    let downloadUrl: string | null = null;
    if (pack.file_url) {
      const ext = pack.file_url.split(".").pop();
      const dlName = ext && ext.length <= 8 ? `${pack.title}.${ext}` : pack.title;
      const { data: signed } = await supabase.storage
        .from("beat-files")
        .createSignedUrl(pack.file_url, 60 * 60, { download: dlName });
      if (signed) downloadUrl = signed.signedUrl;
    }

    const producer = pack.producer as unknown as { display_name: string } | null;

    return NextResponse.json({
      beat: {
        id: pack.id,
        title: pack.title,
        genre: "Pakke",
        bpm: null,
        key: null,
        cover_url: pack.cover_url,
        producer_name: producer?.display_name ?? "Ukjent",
      },
      customerEmail: session.customer_details?.email ?? null,
      downloadUrl,
    });
  }

  // --- Remake path ---
  if (remakeId) {
    const { data: remake, error: remakeError } = await supabase
      .from("remakes")
      .select("id, title, genre, bpm, key, cover_url, file_url, producer:profiles(display_name)")
      .eq("id", remakeId)
      .single();

    if (remakeError || !remake) {
      return NextResponse.json({ error: "Remake ikke funnet" }, { status: 404 });
    }

    let downloadUrl: string | null = null;
    if (remake.file_url) {
      const ext = remake.file_url.split(".").pop();
      const dlName = ext && ext.length <= 8 ? `${remake.title}.${ext}` : remake.title;
      const { data: signed, error: signError } = await supabase.storage
        .from("beat-files")
        .createSignedUrl(remake.file_url, 60 * 60, { download: dlName });
      if (!signError) downloadUrl = signed.signedUrl;
    }

    const producer = remake.producer as unknown as { display_name: string } | null;

    return NextResponse.json({
      beat: {
        id: remake.id,
        title: remake.title,
        genre: remake.genre,
        bpm: remake.bpm,
        key: remake.key,
        cover_url: remake.cover_url,
        producer_name: producer?.display_name ?? "Ukjent",
      },
      customerEmail: session.customer_details?.email ?? null,
      downloadUrl,
    });
  }

  // --- Sample path ---
  if (sampleId) {
    const { data: sample, error: sampleError } = await supabase
      .from("samples")
      .select("id, title, category, cover_url, file_url, producer:profiles(display_name)")
      .eq("id", sampleId)
      .single();

    if (sampleError || !sample) {
      return NextResponse.json({ error: "Sample ikke funnet" }, { status: 404 });
    }

    let downloadUrl: string | null = null;
    if (sample.file_url) {
      if (sample.file_url.startsWith("http")) {
        // Legacy: public URL (sample-previews bucket) — use directly
        downloadUrl = sample.file_url;
      } else {
        // New: raw path in beat-files — sign it
        const ext = sample.file_url.split(".").pop();
        const dlName = ext && ext.length <= 8 ? `${sample.title}.${ext}` : sample.title;
        const { data: signed } = await supabase.storage
          .from("beat-files")
          .createSignedUrl(sample.file_url, 60 * 60, { download: dlName });
        if (signed) downloadUrl = signed.signedUrl;
      }
    }

    const producer = sample.producer as unknown as { display_name: string } | null;

    return NextResponse.json({
      beat: {
        id: sample.id,
        title: sample.title,
        genre: sample.category,
        bpm: null,
        key: null,
        cover_url: sample.cover_url,
        producer_name: producer?.display_name ?? "Ukjent",
      },
      customerEmail: session.customer_details?.email ?? null,
      downloadUrl,
    });
  }

  // --- Beat path ---
  // 2. Fetch beat from DB
  if (isExclusive) {
    const { error: exclusiveError } = await supabase
      .from("beats")
      .update({ exclusively_sold: true })
      .eq("id", beatId!);
    if (exclusiveError) {
      console.error("[verify-session] Failed to mark beat as exclusively_sold:", exclusiveError.message);
    }
  }

  const { data: beat, error: beatError } = await supabase
    .from("beats")
    .select("id, title, genre, bpm, key, cover_url, project_file_url, producer:profiles(display_name)")
    .eq("id", beatId!)
    .single();

  if (beatError || !beat) {
    console.error("[verify-session] Beat not found:", beatError?.message);
    return NextResponse.json({ error: "Låt ikke funnet" }, { status: 404 });
  }

  // 3. Generate signed download URL (valid 1 hour)
  let downloadUrl: string | null = null;
  if (beat.project_file_url) {
    const ext = beat.project_file_url.split(".").pop();
    const dlName = ext && ext.length <= 8 ? `${beat.title}.${ext}` : beat.title;
    const { data: signed, error: signError } = await supabase.storage
      .from("beat-files")
      .createSignedUrl(beat.project_file_url, 60 * 60, { download: dlName });

    if (signError) {
      console.error("[verify-session] Failed to create signed URL:", signError.message);
    } else {
      downloadUrl = signed.signedUrl;
    }
  }

  const producer = beat.producer as unknown as { display_name: string } | null;

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
