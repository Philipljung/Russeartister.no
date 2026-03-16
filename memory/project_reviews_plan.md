---
name: Reviews feature plan
description: Full technical plan for the Reviews system with stars, text, and song title access control
type: project
---

# Reviews Feature — Implementation Plan

**Why:** After a custom beat order is completed, the customer can leave a star rating + text review on the producer. Song titles in orders are highly confidential — they are part of the NDA and must never be visible to anyone except the customer, the producer, and admin.

**How to apply:** Reference this when building the Reviews feature. It covers access control strategy, DB schema, UI, and privacy rules.

---

## Song title / brief confidentiality — critical requirement

The song title is contained in the `brief` field of an order, and is reproduced in the `order_contracts.content` (the NDA text). It must only ever be readable by:
- The `customer_id` of the order
- The `producer_id` of the order
- Platform admin

**Primary mechanism: Row Level Security (RLS)**

RLS policies on `orders` and `order_contracts` enforce:
- SELECT allowed only where `auth.uid() = customer_id OR auth.uid() = producer_id OR is_admin(auth.uid())`
- No public reads, no joining these tables from public-facing queries

This means:
- Other users cannot query the song title — the DB refuses the request at the row level
- The NDA contract text (which contains the song title) is behind the same policy
- The contract PDF is generated server-side via an authenticated API route and stored in a **private** Supabase storage bucket (not publicly accessible — accessed via signed URLs only)

**Encryption is optional / v2.** RLS-level isolation is the primary and sufficient protection for v1. Encryption (AES-256-GCM server-side) can be added later if there is a specific compliance requirement, but it adds complexity (key rotation, migration risk) without meaningful practical benefit on top of solid RLS.

**Practical rule: never expose `brief` or `order_contracts.content` through any public API endpoint or client-side fetch without authentication.**

---

## Reviews DB schema

### `reviews`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK orders | one review per order |
| reviewer_id | uuid FK profiles | the customer |
| producer_id | uuid FK profiles | denormalized for easy query |
| rating | int | 1–5 stars |
| delivered_on_time | bool | was the order delivered by the agreed deadline? |
| text | text | freeform review text (plaintext — the customer's words, not the song title) |
| is_visible | bool default true | admin can hide inappropriate reviews |
| created_at | timestamptz | |

**Unique constraint:** `(order_id)` — one review per completed order.

**Who can write a review?** Only the `customer_id` of a `completed` order, and only once.

**Who can see reviews?** Anyone visiting the producer's profile. The review text is the customer's own words — not confidential. The order it references stays private (no song title shown in the review).

**What is NOT shown in the review:**
- Song title / brief (stays encrypted in the order)
- Order ID (not surfaced publicly)
- Any other order details

**What IS shown:**
- Star rating
- "Levert til avtalt tid?" — Yes / No badge derived from `delivered_on_time`
- Review text
- A vague label like "Verifisert kjøper" (Verified buyer) — confirms the review is from a real order without revealing which one

---

## UI

### Producer profile page — reviews section
- Star average + total count at the top of the profile
- List of individual reviews: stars + text + "Verifisert kjøper" + relative date
- Newest first

### Order detail page — after completion
- Customer gets a one-time prompt: "Legg igjen en anmeldelse"
- Input: 1–5 stars (clickable stars) + "Ble ordren levert til avtalt tid?" (Ja / Nei toggle) + text field
- Submit → `POST /api/reviews/create` (server validates order is `completed` and reviewer is the `customer_id`)
- After submission: read-only, not editable

### Review reminder email
- Triggered 5 days after `order.completed_at` (via cron or delayed job)
- Only sent if `reviews` table has no row for that `order_id` yet
- Subject: "Hva synes du om bestillingen din?"
- Body: brief thank-you + link directly to `/ordre/[orderId]#anmeldelse` scroll anchor
- Sent once only — do not re-send if ignored

### Admin
- Can toggle `is_visible = false` to hide a review without deleting it

---

## API routes

| route | method | purpose |
|---|---|---|
| `POST /api/reviews/create` | POST | submit a review (validate order completed, one per order) |
| `GET /api/reviews/[producerId]` | GET | fetch all visible reviews for a producer |

---

## Edge cases

- Producer cannot review themselves
- Customer can only review once per order
- Review only allowed after `status = 'completed'`
- Admin can hide but not delete reviews (audit trail)
- No editing after submission (prevents gaming the system)
