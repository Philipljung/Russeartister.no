import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const APPLICATION_FEE_PERCENT = 0.15; // 15%

/** Konverterer NOK til øre (Stripe bruker minste valutaenhet) */
export function nokToOre(nok: number): number {
  return Math.round(nok * 100);
}
