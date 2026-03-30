import { getSupabaseClient } from "./supabase/client";
import type { Profile } from "./supabase/types";

export async function fetchProfileByUsername(identifier: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const trimmed = decodeURIComponent(identifier).trim();

  // Try username first
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", trimmed)
    .single();

  if (data) return data as Profile;

  // Fallback: try display_name
  if (error?.code === "PGRST116") {
    const { data: byName, error: nameError } = await supabase
      .from("profiles")
      .select("*")
      .ilike("display_name", trimmed)
      .single();

    if (byName) return byName as Profile;
    if (nameError && nameError.code !== "PGRST116") {
      console.error("[fetchProfile] Unexpected error:", nameError.code, nameError.message);
    }
    return null;
  }

  if (error) {
    console.error("[fetchProfile] Unexpected error:", error.code, error.message);
  }
  return null;
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
