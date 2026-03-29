import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  console.log("[onboard] POST /api/stripe/onboard called");

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("[onboard] auth.getUser result — user:", user?.email ?? "none", "error:", authError?.message ?? "none");

    if (authError || !user) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_account_id, username")
      .eq("id", user.id)
      .single();

    console.log("[onboard] Profile fetch — username:", profile?.username ?? "none", "error:", profileError?.message ?? "none");

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profil ikke funnet" }, { status: 404 });
    }

    let accountId = profile.stripe_account_id as string | null;

    if (!accountId) {
      console.log("[onboard] Creating new Stripe Express account for:", profile.username);

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
      console.log("[onboard] Created Stripe account:", accountId);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);

      if (updateError) {
        console.error("[onboard] Failed to save stripe_account_id:", updateError.message);
        // Don't abort — the account exists in Stripe, just log the error
      }
    } else {
      console.log("[onboard] Existing Stripe account:", accountId);
    }

    console.log("[onboard] Creating account link for:", accountId);

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile/${profile.username}?stripe=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile/${profile.username}?stripe=success`,
      type: "account_onboarding",
    });

    console.log("[onboard] Account link created:", accountLink.url);

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("[onboard] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Intern feil" },
      { status: 500 }
    );
  }
}
