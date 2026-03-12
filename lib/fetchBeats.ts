import { createClient } from "./supabase/client";
import type { Beat } from "./supabase/types";

export async function fetchBeats(): Promise<Beat[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("beats")
    .select("*, producer:profiles(id, display_name, username, avatar_url)")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Beat[]) ?? [];
}
