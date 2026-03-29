import { getSupabaseClient } from "./supabase/client";
import type { Beat } from "./supabase/types";

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

export async function fetchPublicBeats(): Promise<Beat[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("beats")
    .select("*, producer:profiles(*)")
    .eq("is_published", true)
    .eq("exclusively_sold", false)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchBeats] Error fetching public beats:", error.code, error.message);
    return [];
  }

  return (data ?? []) as Beat[];
}
