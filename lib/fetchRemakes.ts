import { getSupabaseClient } from "./supabase/client";
import type { Remake } from "./supabase/types";

export async function fetchPublicRemakes(): Promise<Remake[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("remakes")
    .select("*, producer:profiles(*)")
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) { console.error("[fetchRemakes]", error.message); return []; }
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
