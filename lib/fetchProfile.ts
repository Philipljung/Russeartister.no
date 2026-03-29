import { getSupabaseClient } from "./supabase/client";
import type { Profile } from "./supabase/types";

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .single();

  if (error) {
    // PGRST116 = row not found (expected when profile doesn't exist)
    if (error.code !== "PGRST116") {
      console.error("[fetchProfile] Unexpected error:", error.code, error.message);
    }
    return null;
  }

  return data as Profile;
}

export async function fetchProfileById(id: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[fetchProfile] Unexpected error:", error.code, error.message);
    }
    return null;
  }

  return data as Profile;
}
