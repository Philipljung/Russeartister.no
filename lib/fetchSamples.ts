import { getSupabaseClient } from "./supabase/client";
import type { Sample } from "./supabase/types";

export interface SamplesFilter {
  query?: string;
  itemType?: "sample" | "preset";
  category?: string;
  genre?: string;
  vst?: string;
  from?: number;
  to?: number;
}

const PAGE_SIZE = 20;

export async function fetchPublicSamples(filters: SamplesFilter = {}): Promise<Sample[]> {
  const {
    query = "",
    itemType,
    category = "",
    genre = "",
    vst = "",
    from = 0,
    to = PAGE_SIZE - 1,
  } = filters;

  const supabase = getSupabaseClient();
  let q = supabase
    .from("samples")
    .select("*, producer:profiles(*)")
    .eq("is_published", true)
    .is("deleted_at", null);

  if (itemType) {
    q = q.eq("item_type", itemType);
  } else {
    q = q.in("item_type", ["sample", "preset"]);
  }

  if (query) q = q.ilike("title", `%${query}%`);
  if (category) q = q.eq("category", category);
  if (genre) q = q.eq("genre", genre);
  if (vst) q = q.eq("vst", vst);

  q = q.order("created_at", { ascending: false }).range(from, to).limit(to - from + 1);

  const { data, error } = await q;
  if (error) {
    console.error("[fetchSamples] Error:", error.code, error.message);
    return [];
  }
  return (data ?? []) as Sample[];
}

export async function fetchSamplesByProducer(producerId: string): Promise<Sample[]> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from("samples")
      .select("*, producer:profiles(*)")
      .eq("producer_id", producerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[fetchSamples] Error:", error.code, error.message);
      return [];
    }
    return (data ?? []) as Sample[];
  } catch (err) {
    console.error("[fetchSamples] Unexpected error:", err);
    return [];
  }
}
