import Stripe from "stripe";

// Singleton Stripe client (server-side only)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

/** Platform fee: 15% of the beat price */
export const APPLICATION_FEE_PERCENT = 0.15;

/** Convert NOK (integer) to øre (Stripe's smallest unit: 1 NOK = 100 øre) */
export function nokToOre(nok: number): number {
  return Math.round(nok * 100);
}
