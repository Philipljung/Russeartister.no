import { getSupabaseClient } from "./supabase/client";
import type { Beat } from "./supabase/types";

export interface BeatsFilter {
  query?: string;
  genre?: string;
  vocal?: string;
  minBpm?: number;
  maxBpm?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  from?: number;
  to?: number;
}

const PAGE_SIZE = 20;
const BPM_MIN = 60;
const BPM_MAX = 220;
const PRICE_MIN = 0;
const PRICE_MAX = 30000;

export async function fetchPublicBeats(filters: BeatsFilter = {}): Promise<Beat[]> {
  const {
    query = "",
    genre = "",
    vocal = "",
    minBpm = BPM_MIN,
    maxBpm = BPM_MAX,
    minPrice = PRICE_MIN,
    maxPrice = PRICE_MAX,
    sortBy = "",
    from = 0,
    to = PAGE_SIZE - 1,
  } = filters;

  const supabase = getSupabaseClient();
  let q = supabase
    .from("beats")
    .select("*, producer:profiles(*)")
    .eq("is_published", true)
    .eq("exclusively_sold", false)
    .is("deleted_at", null);

  if (query) q = q.ilike("title", `%${query}%`);
  if (genre) q = q.eq("genre", genre);
  if (vocal) q = q.eq("vocal_type", vocal);
  if (minBpm > BPM_MIN) q = q.gte("bpm", minBpm);
  if (maxBpm < BPM_MAX) q = q.lte("bpm", maxBpm);
  if (minPrice > PRICE_MIN) q = q.gte("price", minPrice);
  if (maxPrice < PRICE_MAX) q = q.lte("price", maxPrice);

  const sortCol = sortBy === "price_asc" || sortBy === "price_desc" ? "price"
    : sortBy === "bpm_asc" || sortBy === "bpm_desc" ? "bpm"
    : "created_at";
  const ascending = sortBy === "price_asc" || sortBy === "bpm_asc";
  q = q.order(sortCol, { ascending });

  q = q.range(from, to);

  const { data, error } = await q;
  if (error) {
    console.error("[fetchBeats] Error:", error.code, error.message);
    return [];
  }
  return (data ?? []) as Beat[];
}

export async function fetchBeatsByProducer(producerId: string): Promise<Beat[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("beats")
    .select("*, producer:profiles(*)")
    .eq("producer_id", producerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchBeats] Error fetching beats:", error.code, error.message);
    return [];
  }
  return (data ?? []) as Beat[];
}
