import { getSupabaseClient } from "./supabase/client";
import type { Sample } from "./supabase/types";

export async function fetchPublicSamples(): Promise<Sample[]> {
  const supabase = getSupabaseClient();
  console.log("[fetchSamples] Fetching all public samples...");

  try {
    const { data, error } = await supabase
      .from("samples")
      .select("*, producer:profiles(*)")
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[fetchSamples] Error:", error.code, error.message);
      return [];
    }

    console.log("[fetchSamples] Found", data?.length ?? 0, "samples");
    return (data ?? []) as Sample[];
  } catch (err) {
    console.error("[fetchSamples] Unexpected error:", err);
    return [];
  }
}

export async function fetchSamplesByProducer(producerId: string): Promise<Sample[]> {
  const supabase = getSupabaseClient();
  console.log("[fetchSamples] Fetching samples for producer:", producerId);

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

    console.log("[fetchSamples] Found", data?.length ?? 0, "samples for producer:", producerId);
    return (data ?? []) as Sample[];
  } catch (err) {
    console.error("[fetchSamples] Unexpected error:", err);
    return [];
  }
}
