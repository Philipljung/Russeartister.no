import { getSupabaseClient } from "./supabase/client";
import type { Profile } from "./supabase/types";

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  console.log("[fetchProfile] Fetching profile for username:", username);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .single();

  if (error) {
    // PGRST116 = row not found (expected when profile doesn't exist)
    if (error.code === "PGRST116") {
      console.log("[fetchProfile] No profile found for username:", username);
    } else {
      console.error("[fetchProfile] Unexpected error:", error.code, error.message);
    }
    return null;
  }

  console.log("[fetchProfile] Found profile:", data.username, "id:", data.id);
  return data as Profile;
}

export async function fetchProfileById(id: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  console.log("[fetchProfile] Fetching profile for id:", id);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      console.log("[fetchProfile] No profile found for id:", id);
    } else {
      console.error("[fetchProfile] Unexpected error:", error.code, error.message);
    }
    return null;
  }

  console.log("[fetchProfile] Found profile:", data.username);
  return data as Profile;
}
