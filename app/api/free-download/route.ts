import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

function generateOrderNumber(): string {
  return "RA-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type"); // "beat" | "remake" | "sample"
  const id = req.nextUrl.searchParams.get("id");
  if (!type || !id) return NextResponse.json({ error: "Mangler type eller id" }, { status: 400 });

  // Get authenticated user (optional — free downloads work without login too)
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  const service = createServiceClient();

  let rawPath: string | null = null;
  let title = "fil";
  let producerId: string | null = null;

  if (type === "beat") {
    const { data } = await service.from("beats").select("price, project_file_url, title, producer_id").eq("id", id).single();
    if (!data) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    if (data.price !== 0) return NextResponse.json({ error: "Ikke gratis" }, { status: 403 });
    rawPath = data.project_file_url;
    title = data.title ?? "beat";
    producerId = data.producer_id ?? null;
  } else if (type === "remake") {
    const { data } = await service.from("remakes").select("price, file_url, title, producer_id").eq("id", id).single();
    if (!data) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    if (data.price !== 0) return NextResponse.json({ error: "Ikke gratis" }, { status: 403 });
    rawPath = data.file_url;
    title = data.title ?? "remake";
    producerId = data.producer_id ?? null;
  } else if (type === "sample") {
    const { data } = await service.from("samples").select("price, file_url, title, producer_id").eq("id", id).single();
    if (!data) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    if (data.price !== 0) return NextResponse.json({ error: "Ikke gratis" }, { status: 403 });
    rawPath = data.file_url;
    title = data.title ?? "sample";
    producerId = data.producer_id ?? null;
  } else {
    return NextResponse.json({ error: "Ukjent type" }, { status: 400 });
  }

  if (!rawPath) return NextResponse.json({ error: "Ingen fil" }, { status: 404 });

  const filePath = rawPath.startsWith("http")
    ? rawPath.split("/beat-files/")[1]?.split("?")[0]
    : rawPath;

  if (!filePath) return NextResponse.json({ url: rawPath }); // legacy public URL fallback

  const ext = filePath.split(".").pop();
  const downloadName = ext && ext.length <= 8 ? `${title}.${ext}` : title;

  const { data: signed, error } = await service.storage
    .from("beat-files")
    .createSignedUrl(filePath, 3600, { download: downloadName });

  if (error || !signed) return NextResponse.json({ error: "Feil ved generering av URL" }, { status: 500 });

  // Record in purchases so it appears in Mine Nedlastninger (only for logged-in users)
  if (user) {
    const orderNumber = generateOrderNumber();
    const itemTypeCol = type === "beat" ? "beat_id" : type === "remake" ? "remake_id" : "sample_id";
    const { error: insertError } = await service.from("purchases").insert({
      [itemTypeCol]: id,
      item_type: type,
      buyer_id: user.id,
      producer_id: producerId,
      amount_paid: 0,
      order_number: orderNumber,
      stripe_payment_intent_id: null,
    });
    if (insertError) {
      console.error("[free-download] Purchase insert failed:", insertError.message);
    } else {
      console.log("[free-download] Free purchase recorded:", orderNumber);
    }
  }

  return NextResponse.json({ url: signed.signedUrl });
}
