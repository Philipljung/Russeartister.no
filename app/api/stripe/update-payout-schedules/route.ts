import { NextRequest, NextResponse } from "next/server";
import { stripe, PAYOUT_SCHEDULE } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

// Admin-only: update all existing connected accounts to the payout schedule in lib/stripe.ts.
// Call once via curl or Postman with the admin secret:
// POST /api/stripe/update-payout-schedules
// Headers: x-admin-secret: <ADMIN_SECRET env var>
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("stripe_onboarding_complete", true)
    .not("stripe_account_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { accountId: string; status: "ok" | "failed"; error?: string }[] = [];

  for (const profile of profiles ?? []) {
    const accountId = profile.stripe_account_id as string;
    try {
      await stripe.accounts.update(accountId, {
        settings: { payouts: { schedule: PAYOUT_SCHEDULE } },
      });
      results.push({ accountId, status: "ok" });
    } catch (err) {
      results.push({ accountId, status: "failed", error: String(err) });
    }
  }

  const failed = results.filter((r) => r.status === "failed");
  return NextResponse.json({
    schedule: PAYOUT_SCHEDULE,
    total: results.length,
    ok: results.length - failed.length,
    failed: failed.length,
    details: failed,
  });
}
