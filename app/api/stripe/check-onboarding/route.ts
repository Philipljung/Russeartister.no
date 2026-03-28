import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/stripe/check-onboarding
 *
 * Checks the connected Stripe account's status and updates
 * stripe_onboarding_complete in the DB if fully verified.
 */
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ complete: false });
    }

    if (profile.stripe_onboarding_complete) {
      return NextResponse.json({ complete: true });
    }

    // Check directly with Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const isComplete = account.charges_enabled && account.payouts_enabled;

    if (isComplete) {
      await supabase
        .from("profiles")
        .update({ stripe_onboarding_complete: true })
        .eq("id", user.id);
    }

    return NextResponse.json({ complete: isComplete });
  } catch (err) {
    console.error("[check-onboarding] Error:", err);
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
