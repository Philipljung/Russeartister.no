import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_account_id, username")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profil ikke funnet" }, { status: 404 });
    }

    let accountId = profile.stripe_account_id as string | null;

    if (!accountId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const isLocalhost = appUrl.includes("localhost") || appUrl.includes("127.0.0.1");

      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        // Stripe rejects localhost URLs — only set in production
        ...(!isLocalhost && {
          business_profile: {
            url: `${appUrl}/profile/${profile.username}`,
          },
        }),
      });

      accountId = account.id;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);

      if (updateError) {
        console.error("[onboard] Failed to save stripe_account_id:", updateError.message);
        // Don't abort — the account exists in Stripe, just log the error
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile/${profile.username}?stripe=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile/${profile.username}?stripe=success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("[onboard] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Intern feil" },
      { status: 500 }
    );
  }
}
