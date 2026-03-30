import { getSupabaseClient } from "./supabase/client";
import { slugifyName } from "./slugify";
import type { Profile } from "./supabase/types";

export async function fetchProfileByUsername(identifier: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const trimmed = decodeURIComponent(identifier).trim();
  const slug = slugifyName(trimmed);

  // Try display_name exact match
  const { data: byName } = await supabase
    .from("profiles")
    .select("*")
    .ilike("display_name", trimmed)
    .single();
  if (byName) return byName as Profile;

  // Try username exact match
  const { data: byUsername } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", trimmed)
    .single();
  if (byUsername) return byUsername as Profile;

  // Try deslugified (hyphens → spaces)
  const deslugified = trimmed.replace(/-/g, " ");
  if (deslugified !== trimmed) {
    const { data: byDeslug } = await supabase
      .from("profiles")
      .select("*")
      .ilike("display_name", deslugified)
      .single();
    if (byDeslug) return byDeslug as Profile;
  }

  // Fuzzy: fetch candidates by prefix and compare slugified display_names
  const prefix = trimmed.split("-")[0] || trimmed.substring(0, 3);
  const { data: candidates } = await supabase
    .from("profiles")
    .select("*")
    .ilike("display_name", `${prefix}%`);

  if (candidates) {
    const match = candidates.find(
      (r: Profile) => slugifyName(r.display_name ?? "") === slug
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
