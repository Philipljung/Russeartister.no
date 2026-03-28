import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Beat } from "@/lib/supabase/types";
import BeatDetailClient from "./BeatDetailClient";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://russeartister.no";

async function fetchBeat(id: string): Promise<Beat | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("beats")
    .select("*, producer:profiles(*)")
    .eq("id", id)
    .eq("is_published", true)
    .single();
  return (data as Beat) ?? null;
}

async function fetchRecommended(beat: Beat): Promise<Beat[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("beats")
    .select("*, producer:profiles(*)")
    .eq("is_published", true)
    .eq("exclusively_sold", false)
    .is("deleted_at", null)
    .neq("id", beat.id)
    .limit(40);

  const candidates = (data ?? []) as Beat[];

  return candidates
    .map((b) => {
      let score = 0;
      if (b.producer_id === beat.producer_id) score += 3;
      if (b.genre === beat.genre) score += 2;
      score += b.tags.filter((t) => beat.tags.includes(t)).length;
      if (Math.abs(b.bpm - beat.bpm) <= 15) score += 1;
      return { beat: b, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.beat);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const beat = await fetchBeat(id);
  if (!beat) return { title: "Låt ikke funnet" };

  const producer = beat.producer;
  const description = [
    producer?.display_name,
    beat.genre,
    `${beat.bpm} BPM`,
    beat.key,
    beat.price === 0 ? "Gratis" : `kr ${beat.price.toLocaleString("nb-NO")}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `${beat.title} – ${producer?.display_name ?? "Russeartister"}`,
    description,
    openGraph: {
      title: beat.title,
      description,
      url: `${APP_URL}/later/${beat.id}`,
      siteName: "Russeartister.no",
      images: beat.cover_url ? [{ url: beat.cover_url, width: 800, height: 800 }] : [],
      type: "music.song",
    },
    twitter: {
      card: "player",
      title: beat.title,
      description,
      images: beat.cover_url ? [beat.cover_url] : [],
      ...(beat.audio_preview_url ? {
        players: [{
          playerUrl: `${APP_URL}/api/embed/beat/${beat.id}`,
          streamUrl: beat.audio_preview_url,
          width: 480,
          height: 90,
        }],
      } : {}),
    },
  };
}

export default async function BeatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const beat = await fetchBeat(id);
  if (!beat) notFound();

  const supabase = await getSupabaseServerClient();
  const { data: purchaseCount } = await supabase
    .rpc("beat_purchase_count", { beat_id: beat.id });

  const recommended = await fetchRecommended(beat);
  const exclusiveAvailable =
    !!beat.exclusive_price && !beat.exclusively_sold && (purchaseCount ?? 0) === 0;

  return (
    <BeatDetailClient
      beat={beat}
      recommended={recommended}
      exclusiveAvailable={exclusiveAvailable}
    />
  );
}
