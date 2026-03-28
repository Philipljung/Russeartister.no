# TODO

- [ ] Add `STRIPE_WEBHOOK_SECRET` to Vercel env vars before going live (production purchases won't record without it)
- [ ] Fix anonymous purchases — require login before checkout so purchases always have a buyer_id and appear in Mine Nedlastninger
- [ ] Remove `payout_released_at` column from purchases table if escrow won't be re-implemented (keep if it will)
- [ ] Fix Discord embed play button — `twitter:player` approach not working, investigate alternatives
