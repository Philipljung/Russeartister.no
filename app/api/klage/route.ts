import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendBatch, buildComplaintConfirmationEmail } from "@/lib/email";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "russeartister@gmail.com";
const FROM = "Russeartister.no <noreply@russeartister.no>";

/** Resolve a stored file path / full URL to a signed download URL. */
async function makeSignedUrl(
  supabase: ReturnType<typeof createServiceClient>,
  rawPath: string | null,
  filename: string,
  expiresIn = 60 * 60 * 24 * 7
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
  const formData = await request.formData();
  const orderNumber = (formData.get("orderNumber") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim();
  const file = formData.get("file") as File | null;

  if (!orderNumber || !description) {
    return NextResponse.json({ error: "Mangler felt" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Find purchase by order number
  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .select("id, order_number, customer_email, item_type, beat_id, remake_id, sample_id, complaint_filed_at")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (purchaseError || !purchase) {
    return NextResponse.json({ error: "Ordrenummer ikke funnet" }, { status: 404 });
  }

  if (purchase.complaint_filed_at) {
    return NextResponse.json({ error: "Det er allerede sendt en klage for denne bestillingen" }, { status: 409 });
  }

  // Resolve item title AND original artist file path
  let itemTitle = "Ukjent";
  let artistFileRawPath: string | null = null;

  if (purchase.item_type === "beat" && purchase.beat_id) {
    const { data } = await supabase.from("beats").select("title, project_file_url").eq("id", purchase.beat_id).single();
    if (data) { itemTitle = data.title; artistFileRawPath = data.project_file_url; }
  } else if (purchase.item_type === "remake" && purchase.remake_id) {
    const { data } = await supabase.from("remakes").select("title, file_url").eq("id", purchase.remake_id).single();
    if (data) { itemTitle = data.title; artistFileRawPath = data.file_url; }
  } else if (purchase.item_type === "sample" && purchase.sample_id) {
    const { data } = await supabase.from("samples").select("title, file_url").eq("id", purchase.sample_id).single();
    if (data) { itemTitle = data.title; artistFileRawPath = data.file_url; }
  }

  // Generate signed URL for artist's original file (14 days)
  const artistFileUrl = await makeSignedUrl(supabase, artistFileRawPath, `${itemTitle} (original)`, 60 * 60 * 24 * 14);

  // Upload the file the customer claims to have received
  let customerFileUrl: string | null = null;
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `complaints/${purchase.id}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    // Default to octet-stream so DAW project files (.als, .flp, .zip, etc.) download correctly
    const contentType = file.type || "application/octet-stream";
    const { error: uploadError } = await supabase.storage
      .from("beat-files")
      .upload(path, buffer, { contentType, upsert: false });

    if (!uploadError) {
      const { data: signed } = await supabase.storage
        .from("beat-files")
        .createSignedUrl(path, 60 * 60 * 24 * 14, { download: file.name });
      customerFileUrl = signed?.signedUrl ?? null;
    } else {
      console.error("[klage] Customer file upload failed:", uploadError.message);
    }
  }

  // Mark complaint on purchase
  await supabase
    .from("purchases")
    .update({ complaint_filed_at: new Date().toISOString() })
    .eq("id", purchase.id);

  // Build emails and send as a single batch API call
  const emails = [];

  if (purchase.customer_email) {
    emails.push(buildComplaintConfirmationEmail({ customerEmail: purchase.customer_email, orderNumber, itemTitle }));
  }

  emails.push({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Klage mottatt: ${orderNumber} - ${itemTitle}`,
    html: `
<!DOCTYPE html>
<html lang="no">
<body style="font-family:sans-serif;background:#080808;color:#f5f5f7;margin:0;padding:32px;">
  <div style="max-width:520px;margin:0 auto;">
    <h1 style="font-size:20px;margin-bottom:4px;">Ny klage</h1>
    <p style="color:#86868b;margin-top:0;">${orderNumber}</p>

    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin:24px 0;font-size:14px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#86868b;padding:4px 0;width:130px;">Bestilling</td><td>${orderNumber}</td></tr>
        <tr><td style="color:#86868b;padding:4px 0;">Tittel</td><td>${itemTitle}</td></tr>
        <tr><td style="color:#86868b;padding:4px 0;">Kjøper</td><td>${purchase.customer_email ?? "Ukjent"}</td></tr>
      </table>
    </div>

    <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin:0 0 24px;font-size:14px;">
      <p style="margin:0 0 8px;color:#86868b;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Klagers beskrivelse</p>
      <p style="margin:0;white-space:pre-wrap;">${description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
    </div>

    <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#86868b;">Filen kjøper mottok</p>
    ${customerFileUrl
      ? `<a href="${customerFileUrl}" style="display:block;text-align:center;background:#2a2a2a;color:#f5f5f7;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;margin-bottom:16px;">Last ned (kjøpers fil, 14 dager)</a>`
      : `<p style="color:#3a3a3a;font-size:13px;margin-bottom:16px;">Ingen fil vedlagt av kjøper.</p>`}

    <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#86868b;">Filen artisten lastet opp</p>
    ${artistFileUrl
      ? `<a href="${artistFileUrl}" style="display:block;text-align:center;background:#1a3a2a;color:#34d399;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;margin-bottom:24px;">Last ned (artistens original, 14 dager)</a>`
      : `<p style="color:#3a3a3a;font-size:13px;margin-bottom:24px;">Ingen originalfil registrert for denne bestillingen.</p>`}

    <p style="color:#86868b;font-size:13px;">Husk å reversere overføringen til produsenten i Stripe hvis klagen er gyldig.</p>
  </div>
</body>
</html>`,
  });

  console.log("[klage] Sending batch of", emails.length, "emails");
  try {
    await sendBatch(emails);
    console.log("[klage] Batch sent ok");
  } catch (err) {
    console.error("[klage] Batch email failed:", err);
  }

  return NextResponse.json({ ok: true });
}
