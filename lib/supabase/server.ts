import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Used in Server Components and Route Handlers (not in middleware — see middleware.ts).
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can throw in Server Components (read-only context). Safe to ignore.
          }
        },
      },
    }
  );
}

/** Alias used by Route Handlers that import { createClient }. */
export const createClient = getSupabaseServerClient;

/**
 * Service-role client — bypasses RLS.
 * Use ONLY in trusted server contexts (webhooks, crons).
 * Sync — no cookies needed.
 */
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  );
}
