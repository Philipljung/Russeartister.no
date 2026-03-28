import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS } from "@/lib/sampleCategories";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: sample } = await supabase
    .from("samples")
    .select("title, audio_preview_url, item_type, category, producer:profiles(display_name)")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (!sample || !sample.audio_preview_url) {
    return new NextResponse("Not found", { status: 404 });
  }

  const producer = sample.producer as unknown as { display_name: string } | null;
  const typeLabel = sample.item_type === "preset" ? "Preset" : sample.item_type === "sample-pack" ? "Sample Pack" : sample.item_type === "preset-pack" ? "Preset Pack" : "Sample";
  const sub = [producer?.display_name, typeLabel, CATEGORY_LABELS[sample.category] ?? sample.category].filter(Boolean).join(" · ");

  const html = buildEmbed(sample.title, sub, sample.audio_preview_url);
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
