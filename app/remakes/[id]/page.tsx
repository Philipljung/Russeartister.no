import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Remake } from "@/lib/supabase/types";
import RemakeDetailClient from "./RemakeDetailClient";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://russeartister.no";

async function fetchRemake(id: string): Promise<Remake | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("remakes")
    .select("*, producer:profiles(*)")
    .eq("id", id)
    .eq("is_published", true)
    .is("deleted_at", null)
    .single();
  return (data as Remake) ?? null;
}

async function fetchRecommended(remake: Remake): Promise<Remake[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("remakes")
    .select("*, producer:profiles(*)")
    .eq("is_published", true)
    .is("deleted_at", null)
    .neq("id", remake.id)
    .limit(40);

  const candidates = (data ?? []) as Remake[];

  return candidates
    .map((r) => {
      let score = 0;
      if (r.producer_id === remake.producer_id) score += 3;
      if (r.genre && remake.genre && r.genre === remake.genre) score += 2;
      return { remake: r, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.remake);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const remake = await fetchRemake(id);
  if (!remake) return { title: "Remake ikke funnet" };

  const producer = remake.producer;
  const description = [
    producer?.display_name,
    remake.genre,
    remake.bpm ? `${remake.bpm} BPM` : null,
    remake.price === 0 ? "Gratis" : `kr ${remake.price.toLocaleString("nb-NO")}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `${remake.title} – ${producer?.display_name ?? "Russeartister"}`,
    description,
    openGraph: {
      title: remake.title,
      description,
      url: `${APP_URL}/remakes/${remake.id}`,
      siteName: "Russeartister.no",
      images: remake.cover_url ? [{ url: remake.cover_url, width: 800, height: 800 }] : [],
      type: "music.song",
    },
    twitter: {
      card: "summary_large_image",
      title: remake.title,
      description,
      images: remake.cover_url ? [remake.cover_url] : [],
    },
  };
}

export default async function RemakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const remake = await fetchRemake(id);
  if (!remake) notFound();

  const recommended = await fetchRecommended(remake);

  return <RemakeDetailClient remake={remake} recommended={recommended} />;
}
