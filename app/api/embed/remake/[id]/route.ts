import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: remake } = await supabase
    .from("remakes")
    .select("title, audio_preview_url, genre, bpm, original_song, producer:profiles(display_name)")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (!remake || !remake.audio_preview_url) {
    return new NextResponse("Not found", { status: 404 });
  }

  const producer = remake.producer as unknown as { display_name: string } | null;
  const sub = [producer?.display_name, `remake av ${remake.original_song}`, remake.bpm ? `${remake.bpm} BPM` : null].filter(Boolean).join(" · ");

  const html = buildEmbed(remake.title, sub, remake.audio_preview_url);
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

function buildEmbed(title: string, sub: string, audioUrl: string) {
  return `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0d0d0d;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;justify-content:center;height:100vh;padding:10px 14px;gap:8px}
.title{color:#f5f5f7;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sub{color:#86868b;font-size:11px}
audio{width:100%;accent-color:#6366f1;height:32px}
</style>
</head>
<body>
<div class="title">${escapeHtml(title)}</div>
<div class="sub">${escapeHtml(sub)}</div>
<audio src="${escapeHtml(audioUrl)}" controls autoplay></audio>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
