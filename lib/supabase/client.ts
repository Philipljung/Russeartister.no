import { createBrowserClient } from "@supabase/ssr";

// Singleton — one client instance for the entire browser session.
// This prevents multiple GoTrueClient warnings and avoids redundant connections.
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    console.log("[supabase/client] Creating new browser client");
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
