import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type"); // "beat" | "remake" | "sample"
  const id = req.nextUrl.searchParams.get("id");
  if (!type || !id) return NextResponse.json({ error: "Mangler type eller id" }, { status: 400 });

  let rawPath: string | null = null;
  let title = "fil";

  if (type === "beat") {
    const { data } = await supabase.from("beats").select("price, project_file_url, title").eq("id", id).single();
    if (!data) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    if (data.price !== 0) return NextResponse.json({ error: "Ikke gratis" }, { status: 403 });
    rawPath = data.project_file_url;
    title = data.title ?? "beat";
  } else if (type === "remake") {
    const { data } = await supabase.from("remakes").select("price, file_url, title").eq("id", id).single();
    if (!data) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    if (data.price !== 0) return NextResponse.json({ error: "Ikke gratis" }, { status: 403 });
    rawPath = data.file_url;
    title = data.title ?? "remake";
  } else if (type === "sample") {
    const { data } = await supabase.from("samples").select("price, file_url, title").eq("id", id).single();
    if (!data) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    if (data.price !== 0) return NextResponse.json({ error: "Ikke gratis" }, { status: 403 });
    rawPath = data.file_url;
    title = data.title ?? "sample";
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

  const { data: signed, error } = await supabase.storage
    .from("beat-files")
    .createSignedUrl(filePath, 3600, { download: downloadName });

  if (error || !signed) return NextResponse.json({ error: "Feil ved generering av URL" }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl });
}
