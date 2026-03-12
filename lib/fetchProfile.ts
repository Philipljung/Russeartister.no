import { createClient } from "./supabase/client";
import type { Profile, Beat } from "./supabase/types";

export async function fetchProfile(username: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .single();
  return data;
}

export async function fetchProfileBeats(producerId: string): Promise<Beat[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("beats")
    .select("*")
    .eq("producer_id", producerId)
    .order("created_at", { ascending: false });
  return (data as Beat[]) ?? [];
}
