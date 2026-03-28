---
name: purchasing_logic
description: Full purchasing flow — Stripe, webhooks, free downloads, Mine Nedlastninger, file storage, upload requirements
type: project
---

# Purchasing Logic — Russeartister.no

This documents the complete end-to-end flow for paid and free item purchases as of the commit "Purchasing logic works".

---

## Paid purchases (Stripe)

### Flow
1. User clicks "Kjøp" on a beat/remake/sample → checkout modal opens
2. Modal calls one of these API routes:
   - `POST /api/stripe/checkout` — beats
   - `POST /api/stripe/checkout-remake` — remakes
   - `POST /api/stripe/checkout-sample` — samples/presets/packs
3. Each creates a Stripe Checkout Session with `metadata` containing:
   - `beat_id` / `remake_id` / `sample_id`
   - `exclusive: "true"` (beats only, if applicable)
   - `client_reference_id` = supabase `user.id` of the buyer (set as `buyerId`)
4. Stripe redirects to success URL after payment
5. Stripe fires `checkout.session.completed` webhook to `/api/webhooks/stripe`

### Webhook (`app/api/webhooks/stripe/route.ts`)
- Verifies Stripe signature using:
  - `STRIPE_WEBHOOK_SECRET_LOCAL` in development (requires Stripe CLI running)
  - `STRIPE_WEBHOOK_SECRET` in production (set in Vercel env vars + Stripe Dashboard)
- Idempotency check: skips if `stripe_payment_intent_id` already exists in `purchases`
- Inserts a row into `purchases` table with:
  - `beat_id` / `remake_id` / `sample_id` (whichever applies)
  - `item_type`: `"beat"` | `"remake"` | `"sample"` (samples/presets/packs all use `"sample"`)
  - `buyer_id`: from `session.client_reference_id`
  - `producer_id`: fetched from the item's DB row
  - `amount_paid`: `session.amount_total / 100` (NOK)
  - `stripe_payment_intent_id`: for idempotency
  - `order_number`: `"RA-"` + 5 random alphanumeric chars
  - `customer_email`: from `session.customer_details.email`
- For exclusive beat purchases: sets `beats.exclusively_sold = true`
- Sends batch emails via Resend:
  - Receipt to buyer (with signed download URL, 7 days)
  - Sale notification to producer
  - Admin notification
- Also handles `account.updated` event to mark Stripe onboarding complete on profiles

### Local development
Must run Stripe CLI to forward webhooks:
```
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
The local webhook secret is already in `.env.local` as `STRIPE_WEBHOOK_SECRET_LOCAL`.

---

## Free downloads (`app/api/free-download/route.ts`)

- Called via `GET /api/free-download?type=beat|remake|sample&id=<uuid>`
- Validates `price === 0` in DB before proceeding
- Generates a signed URL from the `beat-files` private bucket
- If user is logged in: inserts a `purchases` row with `amount_paid: 0`, `stripe_payment_intent_id: null`
  - This makes the item appear in Mine Nedlastninger
- Returns `{ url: signedUrl }`

**Important:** `stripe_payment_intent_id` must be nullable in the DB for free download inserts to work.
Run this SQL if not already done:
```sql
ALTER TABLE public.purchases ALTER COLUMN stripe_payment_intent_id DROP NOT NULL;
```

---

## Mine Nedlastninger (`app/nedlastninger/page.tsx`)

- Fetches all `purchases` rows where `buyer_id = auth.uid()` (RLS required)
- Joins to `beats`, `remakes`, `samples` tables for display info
- Download button calls `GET /api/downloads/[purchaseId]`

### Download route (`app/api/downloads/[purchaseId]/route.ts`)
- Verifies ownership: `purchases.buyer_id = auth.uid()`
- For **beats**: fetches both `project_file_url` and `audio_preview_url`
  - Returns `{ url: signedProjectUrl, audioUrl: audioPreviewUrl }` if project file exists
  - Returns `{ url: audioPreviewUrl, audioUrl: null }` if no project file
  - Client triggers both downloads with 800ms gap between them
- For **remakes**: returns signed URL for `file_url`
- For **samples/presets/packs**: returns signed URL for `file_url`

---

## File storage structure

### Private bucket: `beat-files`
- Beats: `project_file_url` stored as a **raw path** (e.g. `userId/timestamp_project.zip`)
- Remakes: `file_url` stored as raw path
- Samples/presets/packs: `file_url` stored as raw path
- Download requires a signed URL (short-lived, generated server-side)

### Public buckets
- `beat-covers`: cover images for beats
- `beat-previews`: audio preview files for beats and remakes (public URL, no signing needed)
- `sample-previews`: audio preview files for samples/presets/packs (public URL)

---

## Purchases table schema

Required columns (run SQL if missing):
```sql
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS producer_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS remake_id uuid REFERENCES public.remakes(id),
  ADD COLUMN IF NOT EXISTS sample_id uuid REFERENCES public.samples(id);

ALTER TABLE public.purchases
  ALTER COLUMN stripe_payment_intent_id DROP NOT NULL;
```

Full column list:
- `id` uuid PK
- `buyer_id` uuid (nullable — anonymous purchases have no buyer_id, won't show in nedlastninger)
- `producer_id` uuid (nullable)
- `beat_id` uuid (nullable FK → beats)
- `remake_id` uuid (nullable FK → remakes)
- `sample_id` uuid (nullable FK → samples)
- `item_type` text: `"beat"` | `"remake"` | `"sample"`
- `order_number` text (nullable, e.g. `"RA-XK9F2"`)
- `customer_email` text (nullable)
- `amount_paid` integer (NOK, 0 for free)
- `stripe_payment_intent_id` text (nullable)
- `payout_released_at` timestamp (nullable — set by payout cron)
- `complaint_filed_at` timestamp (nullable)
- `created_at` timestamp

---

## Upload requirements per type

### Beats (`app/lastopp/page.tsx`)
- `Lydforhåndsvisning *` — wav/mp3 only — stored in `beat-previews` (public)
- `Prosjektfil` — any file, max 500MB — stored in `beat-files` (private, raw path)
- Buyers receive BOTH files on download

### Remakes (`app/lastopp-remake/page.tsx`)
- `Lydforhåndsvisning *` — wav/mp3 only — stored in `beat-previews` (public)
- `Prosjektfil *` — any file, max 500MB — stored in `beat-files` (private, raw path)

### Samples (`app/lastopp-sample/page.tsx`)
- `Samplefil *` — wav/mp3 only — stored in BOTH `beat-files` (private download) AND `sample-previews` (public streaming)
- No audio_preview_url separate from the sample file itself

### Presets
- `Lydforhåndsvisning` — wav/mp3 optional — stored in `sample-previews`
- `Presetfil *` — any format — stored in `beat-files` (private)

### Sample pack / Preset pack
- `Lydforhåndsvisning` — wav/mp3 optional — stored in `sample-previews`
- `Pack *` — any file, max 500MB — stored in `beat-files` (private)
- If a `.zip` is uploaded, file contents are parsed and stored in `pack_files` column for display

---

## Payout cron — PLANNED FOR FUTURE (not currently active)

> The cron job and escrow system was removed in favour of immediate transfers (webhook fires → 85% transferred directly to producer via `source_transaction`). The escrow/hold system is planned to be re-implemented later. Keep this section as a reference.

## Payout cron (`app/api/cron/release-payouts/route.ts`)

- Runs daily at 02:00 UTC (configured in `vercel.json`)
- Finds purchases where `payout_released_at IS NULL`, `complaint_filed_at IS NULL`, `created_at < 24h ago`
- Calls `stripe.transfers.create()` to send funds from platform Stripe account to producer's connected account
- Platform fee: 15% (`PLATFORM_FEE_PERCENT = 0.15`)
- Sets `payout_released_at = now()` on success
- Requires `producer_id` on the purchase row to know where to send money

---

## Production checklist

- [ ] `STRIPE_WEBHOOK_SECRET` set in Vercel env vars
- [ ] Stripe webhook endpoint `https://russeartister.no/api/webhooks/stripe` registered in Stripe Dashboard for `checkout.session.completed` + `account.updated`
- [ ] `stripe_payment_intent_id` column is nullable in `purchases` table
- [ ] `producer_id`, `customer_email`, `remake_id`, `sample_id` columns exist in `purchases` table
- [ ] Supabase `beat-files` bucket max file size set to 500MB+ (requires Supabase Pro)
