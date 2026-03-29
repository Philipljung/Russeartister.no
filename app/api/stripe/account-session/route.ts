import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/stripe/account-session
 *
 * Creates (or reuses) a Stripe Express account for the logged-in user,
 * then returns a short-lived client_secret for the Connect embedded component.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const country = body.country || "NO";
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
      console.error("[account-session] Profile not found:", profileError?.message);
      return NextResponse.json({ error: "Profil ikke funnet" }, { status: 404 });
    }

    let accountId = profile.stripe_account_id as string | null;

    // Create a Stripe Express account if one doesn't exist yet
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);

      if (updateError) {
        console.error("[account-session] Failed to save stripe_account_id:", updateError.message);
      }
    }

    // Create a short-lived account session for the embedded component
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    return NextResponse.json({ client_secret: accountSession.client_secret });
  } catch (err) {
    console.error("[account-session] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Intern feil" },
      { status: 500 }
    );
  }
}
