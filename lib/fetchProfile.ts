import { getSupabaseClient } from "./supabase/client";
import type { Profile } from "./supabase/types";

export async function fetchProfileByUsername(identifier: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const trimmed = decodeURIComponent(identifier).trim();

  // Try display_name first (preferred identifier)
  const { data: byName } = await supabase
    .from("profiles")
    .select("*")
    .ilike("display_name", trimmed)
    .single();
  if (byName) return byName as Profile;

  // Try username
  const { data: byUsername } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", trimmed)
    .single();
  if (byUsername) return byUsername as Profile;

  // Fuzzy: handle display_names with trailing whitespace in DB
  const { data: fuzzyResults } = await supabase
    .from("profiles")
    .select("*")
    .ilike("display_name", `${trimmed}%`);

  if (fuzzyResults) {
    const match = fuzzyResults.find(
      (r: Profile) => r.display_name?.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (match) return match as Profile;
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
