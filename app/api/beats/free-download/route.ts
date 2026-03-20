import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const beatId = req.nextUrl.searchParams.get("beatId");
  if (!beatId) return NextResponse.json({ error: "Missing beatId" }, { status: 400 });

  const { data: beat } = await supabase
    .from("beats")
    .select("price, project_file_url, title")
    .eq("id", beatId)
    .single();

  if (!beat) return NextResponse.json({ error: "Beat not found" }, { status: 404 });
  if (beat.price !== 0) return NextResponse.json({ error: "Beat is not free" }, { status: 403 });

  // Extract storage path from the stored project_file_url / path
  const rawPath: string = beat.project_file_url ?? "";
  // file_url stores just the path (e.g. "userId/timestamp_remake.zip"), not a full URL
  const filePath = rawPath.startsWith("http")
    ? rawPath.split("/beat-files/")[1]?.split("?")[0]
    : rawPath;

  if (!filePath) return NextResponse.json({ error: "Invalid file path" }, { status: 500 });

  const ext = filePath.split(".").pop();
  const downloadName = ext && ext.length <= 8 ? `${beat.title}.${ext}` : (beat.title ?? "beat");
  const { data: signed, error } = await supabase.storage
    .from("beat-files")
    .createSignedUrl(filePath, 3600, { download: downloadName });

  if (error || !signed) {
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
