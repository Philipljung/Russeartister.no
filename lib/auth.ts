import { getSupabaseClient } from "./supabase/client";

/**
 * Returns the current session from local storage / cookie.
 *
 * IMPORTANT: We use getSession() intentionally, NOT getUser().
 * - getSession() reads the local JWT — zero network calls, instant.
 * - getUser() always hits the Supabase auth server — adds ~200-500ms latency
 *   on every call and was the root cause of previous hanging issues.
 *
 * The session was already validated by Supabase when the user signed in,
 * so reading it locally is safe for client-side use.
 */
export async function getSession() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("[auth] getSession error:", error.message);
    return null;
  }

  return data.session;
}

/** Returns just the user from the current session (no network call). */
export async function getSessionUser() {
  const session = await getSession();
  return session?.user ?? null;
}
