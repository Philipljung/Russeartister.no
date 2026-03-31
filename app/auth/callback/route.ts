import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { slugifyName } from "@/lib/slugify";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const name = (data.user.user_metadata?.display_name ?? data.user.user_metadata?.username) as string | undefined;
      if (name) return NextResponse.redirect(`${origin}/profile/${slugifyName(name)}`);
      return NextResponse.redirect(`${origin}/later`);
    }
  }

  return NextResponse.redirect(`${origin}/logg-inn`);
}
