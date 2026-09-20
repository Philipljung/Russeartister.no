import Stripe from "stripe";

// Singleton Stripe client (server-side only)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

/** Platform fee: 15% + 5 kr fixed per transaction */
export const APPLICATION_FEE_PERCENT = 0.15;
export const PLATFORM_FEE_FIXED_NOK = 5;

/** Convert NOK (integer) to øre (Stripe's smallest unit: 1 NOK = 100 øre) */
export function nokToOre(nok: number): number {
  return Math.round(nok * 100);
}

/**
 * Platform's application fee in øre for a given sale price.
 * = 15% of price + 5 kr fixed (covers Stripe's per-transaction fee on small sales).
 */
export function platformFeeOre(priceNok: number): number {
  return nokToOre(Math.round(priceNok * APPLICATION_FEE_PERCENT) + PLATFORM_FEE_FIXED_NOK);
}
