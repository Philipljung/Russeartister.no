import { getSupabaseClient } from "./supabase/client";
import type { Remake } from "./supabase/types";

export interface RemakesFilter {
  query?: string;
  daw?: string;
  includeVsts?: string[];
  excludeVsts?: string[];
  from?: number;
  to?: number;
}

const PAGE_SIZE = 20;

export async function fetchPublicRemakes(filters: RemakesFilter = {}): Promise<Remake[]> {
  const {
    query = "",
    daw = "",
    includeVsts = [],
    excludeVsts = [],
    from = 0,
    to = PAGE_SIZE - 1,
  } = filters;

  const supabase = getSupabaseClient();
  let q = supabase
    .from("remakes")
    .select("*, producer:profiles(*)")
    .eq("is_published", true)
    .is("deleted_at", null);

  if (query) q = q.ilike("title", `%${query}%`);
  if (daw) q = q.eq("daw", daw);
  if (includeVsts.length > 0) q = q.overlaps("vsts", includeVsts);
  if (excludeVsts.length > 0) q = q.not("vsts", "ov", `{${excludeVsts.join(",")}}`);

  q = q.order("created_at", { ascending: false }).range(from, to).limit(to - from + 1);

  const { data, error } = await q;
  if (error) {
    console.error("[fetchRemakes]", error.message);
    return [];
  }
  return (data ?? []) as Remake[];
}

export async function fetchRemakesByProducer(producerId: string): Promise<Remake[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("remakes")
    .select("*, producer:profiles(*)")
    .eq("producer_id", producerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) { console.error("[fetchRemakes]", error.message); return []; }
  return (data ?? []) as Remake[];
}

export async function fetchExistingGenres(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const [beatsRes, remakesRes] = await Promise.all([
    supabase.from("beats").select("genre").eq("is_published", true).is("deleted_at", null),
    supabase.from("remakes").select("genre").eq("is_published", true).is("deleted_at", null),
  ]);
  const all = [
    ...((beatsRes.data ?? []).map((r: { genre: string }) => r.genre)),
    ...((remakesRes.data ?? []).map((r: { genre: string }) => r.genre)),
  ].filter(Boolean);
  return Array.from(new Set(all)).sort();
}
