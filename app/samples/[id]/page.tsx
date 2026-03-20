import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Sample } from "@/lib/supabase/types";
import SampleDetailClient from "./SampleDetailClient";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://russeartister.no";

async function fetchSample(id: string): Promise<Sample | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("samples")
    .select("*, producer:profiles(*)")
    .eq("id", id)
    .eq("is_published", true)
    .is("deleted_at", null)
    .single();
  return (data as Sample) ?? null;
}

async function fetchRecommended(sample: Sample): Promise<Sample[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("samples")
    .select("*, producer:profiles(*)")
    .eq("is_published", true)
    .is("deleted_at", null)
    .neq("id", sample.id)
    .limit(40);

  const candidates = (data ?? []) as Sample[];

  return candidates
    .map((s) => {
      let score = 0;
      if (s.producer_id === sample.producer_id) score += 3;
      if (s.category === sample.category) score += 2;
      if (s.genre && sample.genre && s.genre === sample.genre) score += 1;
      return { sample: s, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.sample);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sample = await fetchSample(id);
  if (!sample) return { title: "Sample ikke funnet" };

  const producer = sample.producer;
  const description = [
    producer?.display_name,
    sample.category,
    sample.price === 0 ? "Gratis" : `kr ${sample.price.toLocaleString("nb-NO")}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `${sample.title} – ${producer?.display_name ?? "Russeartister"}`,
    description,
    openGraph: {
      title: sample.title,
      description,
      url: `${APP_URL}/samples/${sample.id}`,
      siteName: "Russeartister.no",
      images: sample.cover_url ? [{ url: sample.cover_url, width: 800, height: 800 }] : [],
      type: "music.song",
    },
    twitter: {
      card: "summary_large_image",
      title: sample.title,
      description,
      images: sample.cover_url ? [sample.cover_url] : [],
    },
  };
}

export default async function SampleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sample = await fetchSample(id);
  if (!sample) notFound();

  const recommended = await fetchRecommended(sample);

  return <SampleDetailClient sample={sample} recommended={recommended} />;
}
