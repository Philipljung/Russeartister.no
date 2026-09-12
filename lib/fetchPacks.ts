import { getSupabaseClient } from "./supabase/client";
import type { Pack } from "./supabase/types";

const PAGE_SIZE = 20;

export async function fetchPublicPacks(filters: { query?: string; from?: number; to?: number } = {}): Promise<Pack[]> {
  const { query = "", from = 0, to = PAGE_SIZE - 1 } = filters;

  const supabase = getSupabaseClient();
  let q = supabase
    .from("packs")
    .select("*, producer:profiles(*), pack_items(*)")
    .eq("is_published", true)
    .is("deleted_at", null);

  if (query) q = q.ilike("title", `%${query}%`);

  q = q.order("created_at", { ascending: false }).range(from, to);

  const { data, error } = await q;
  if (error) {
    console.error("[fetchPacks] Error:", error.code, error.message);
    return [];
  }
  return (data ?? []) as Pack[];
}

export async function fetchPacksByProducer(producerId: string): Promise<Pack[]> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from("packs")
      .select("*, producer:profiles(*), pack_items(*)")
      .eq("producer_id", producerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[fetchPacks] Error:", error.code, error.message);
      return [];
    }
    return (data ?? []) as Pack[];
  } catch (err) {
    console.error("[fetchPacks] Unexpected error:", err);
    return [];
  }
}
