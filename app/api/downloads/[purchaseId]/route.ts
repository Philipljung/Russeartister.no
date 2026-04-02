import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/downloads/[purchaseId]
 *
 * Verifies the authenticated user owns this purchase, then generates a
 * short-lived signed download URL and redirects to it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  const { purchaseId } = await params;

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  // Fetch purchase — verify ownership
  const service = createServiceClient();
  const { data: purchase, error } = await service
    .from("purchases")
    .select("id, buyer_id, item_type, beat_id, remake_id, sample_id, pack_id, order_number")
    .eq("id", purchaseId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (error || !purchase) {
    console.error("[downloads] Purchase not found or auth mismatch:", purchaseId, error?.message);
    return NextResponse.json({ error: "Kjøp ikke funnet" }, { status: 404 });
  }

  let fileRawPath: string | null = null;
  let filename = "fil";
  let beatAudioUrl: string | null = null;

  if (purchase.item_type === "beat" && purchase.beat_id) {
    const { data: beat } = await service
      .from("beats")
      .select("project_file_url, audio_preview_url, title")
      .eq("id", purchase.beat_id)
      .single();
    fileRawPath = beat?.project_file_url ?? null;
    filename = beat?.title ?? "beat";
    beatAudioUrl = beat?.audio_preview_url ?? null;
  } else if (purchase.item_type === "remake" && purchase.remake_id) {
    const { data: remake } = await service
      .from("remakes")
      .select("file_url, title")
      .eq("id", purchase.remake_id)
      .single();
    fileRawPath = remake?.file_url ?? null;
    filename = remake?.title ?? "prosjekt";
  } else if (purchase.item_type === "sample" && purchase.sample_id) {
    const { data: sample } = await service
      .from("samples")
      .select("file_url, title")
      .eq("id", purchase.sample_id)
      .single();
    fileRawPath = sample?.file_url ?? null;
    filename = sample?.title ?? "sample";
  } else if (purchase.item_type === "pack" && purchase.pack_id) {
    const { data: pack } = await service
      .from("packs")
      .select("file_url, title")
      .eq("id", purchase.pack_id)
      .single();
    fileRawPath = pack?.file_url ?? null;
    filename = pack?.title ?? "pakke";
  } else {
    console.error("[downloads] Unhandled item_type or missing id:", purchase.item_type, "beat_id:", purchase.beat_id, "sample_id:", purchase.sample_id);
  }

  if (!fileRawPath) {
    if (beatAudioUrl) {
      // Beat with only audio preview (no project file)
      return NextResponse.json({ url: beatAudioUrl, audioUrl: null });
    }
    console.error("[downloads] fileRawPath is null for purchase:", purchase.id, "item_type:", purchase.item_type);
    return NextResponse.json({ error: "Fil ikke funnet" }, { status: 404 });
  }

  // Resolve to a final storage path, then sign it.
  // Handles: raw beat-files path, full beat-files https URL, legacy sample-previews public URL.
  function withExt(name: string, path: string): string {
    const ext = path.split(".").pop();
    return ext && ext.length <= 8 ? `${name}.${ext}` : name;
  }

  if (fileRawPath.startsWith("http")) {
    const beatPath = fileRawPath.split("/beat-files/")[1]?.split("?")[0];
    if (beatPath) {
      const downloadName = withExt(filename, beatPath);
      const { data: signed, error: signError } = await service.storage
        .from("beat-files")
        .createSignedUrl(beatPath, 60 * 10, { download: downloadName });
      if (signError || !signed) {
        console.error("[downloads] Failed to create signed URL:", signError?.message);
        return NextResponse.json({ error: "Kunne ikke generere nedlastningslenke" }, { status: 500 });
      }
      return NextResponse.json({ url: signed.signedUrl, audioUrl: beatAudioUrl ?? null });
    }
    // Fallback: public URL from another bucket (e.g. sample-previews) — return directly
    return NextResponse.json({ url: fileRawPath, audioUrl: beatAudioUrl ?? null });
  }

  // Raw path → sign from beat-files
  const downloadName = withExt(filename, fileRawPath);
  const { data: signed, error: signError } = await service.storage
    .from("beat-files")
    .createSignedUrl(fileRawPath, 60 * 10, { download: downloadName });

  if (signError || !signed) {
    console.error("[downloads] Failed to create signed URL:", signError?.message);
    return NextResponse.json({ error: "Kunne ikke generere nedlastningslenke" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, audioUrl: beatAudioUrl ?? null });
}
