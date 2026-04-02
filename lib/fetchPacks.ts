import { getSupabaseClient } from "./supabase/client";
import type { Pack } from "./supabase/types";

export async function fetchPublicPacks(): Promise<Pack[]> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from("packs")
      .select("*, producer:profiles(*), pack_items(*)")
      .eq("is_published", true)
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
