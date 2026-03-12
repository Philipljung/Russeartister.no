import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/beats";

  console.log("[auth/callback] code present:", !!code, "next:", next);

  if (!code) {
    console.error("[auth/callback] No code in URL — redirecting to error");
    return NextResponse.redirect(`${origin}/logg-inn?error=no_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(`${origin}/logg-inn?error=auth`);
  }

  console.log("[auth/callback] Session created for user:", data.user?.email);

  // Redirect to the user's profile using username from metadata
  const username = data.user?.user_metadata?.username as string | undefined;
  const destination = username ? `/profile/${username}` : next;

  console.log("[auth/callback] Redirecting to:", destination);
  return NextResponse.redirect(`${origin}${destination}`);
}
