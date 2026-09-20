import Stripe from "stripe";

// Singleton Stripe client (server-side only)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

/**
 * Platform fee: 12% + 9 kr fixed, never more than 50% of the price.
 * The fixed part makes the effective rate fall as the price rises, and covers Stripe's
 * per-transaction cost (2.4% + 2 kr) on small sales. The cap keeps the fee below the
 * price on very cheap items, so there is no need for a minimum price.
 */
export const PLATFORM_FEE_PERCENT = 0.12;
export const PLATFORM_FEE_FIXED_NOK = 9;
export const PLATFORM_FEE_MAX_SHARE = 0.5;

/** Convert NOK (integer) to øre (Stripe's smallest unit: 1 NOK = 100 øre) */
export function nokToOre(nok: number): number {
  return Math.round(nok * 100);
}

/** Platform's fee in NOK for a given sale price. */
export function platformFeeNok(priceNok: number): number {
  const fee = Math.round(priceNok * PLATFORM_FEE_PERCENT) + PLATFORM_FEE_FIXED_NOK;
  return Math.min(fee, priceNok * PLATFORM_FEE_MAX_SHARE);
}

/** Platform's application fee in øre for a given sale price. */
export function platformFeeOre(priceNok: number): number {
  return nokToOre(platformFeeNok(priceNok));
}
