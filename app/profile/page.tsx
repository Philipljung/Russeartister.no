import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { slugifyName } from "@/lib/slugify";

export default async function ProfileIndex() {
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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/logg-inn");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  const name = profile?.display_name
    ?? profile?.username
    ?? (user.user_metadata?.display_name as string | undefined)
    ?? (user.user_metadata?.username as string | undefined);

  if (name) redirect(`/profile/${slugifyName(name)}`);

  redirect("/later");
}
