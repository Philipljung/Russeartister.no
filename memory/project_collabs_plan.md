---
name: Artist collabs / lineup feature plan
description: Technical plan for producers listing collab artists with prices, and buyers selecting a lineup
type: project
---

# Artist Collabs / Lineup Feature — Implementation Plan

**Why:** A producer offering a custom beat gig may also be able to arrange features from other artists. The buyer should be able to pick which artists they want in their song, with each artist adding to the total price. This is analogous to Fiverr "gig extras" but specifically for artist features.

**How to apply:** Reference this when building the collab/lineup feature. It extends the Gigs and Orders system.

---

## Core concept

- A **producer** with a gig can add a roster of **collab artists** they can arrange (e.g. "Santi" at kr 500, "dj pharao" at kr 800)
- Each collab artist has a name, optional price, optional bio, optional avatar
- If the collab artist is also a platform user, their `profiles` row can be linked (optional)
- When a **customer** places a gig order, they see the available lineup and select which artists they want
- The final order price = gig base price + sum of selected collab artist prices
- The selected collabs are recorded on the order

---

## DB schema

### `collab_artists`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| producer_id | uuid FK profiles | the beat producer who manages this roster |
| artist_name | text | display name |
| artist_profile_id | uuid FK profiles, nullable | if the artist is on the platform |
| price | int | extra cost in NOK for this feature |
| bio | text, nullable | short description |
| avatar_url | text, nullable | |
| is_active | bool default true | producer can deactivate without deleting |
| sort_order | int default 0 | for custom ordering on the gig page |
| created_at | timestamptz | |

### `order_collabs`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK orders | |
| collab_artist_id | uuid FK collab_artists | |
| artist_name_snapshot | text | name at time of order (in case artist is later renamed/deleted) |
| price_snapshot | int | price at time of order |
| created_at | timestamptz | |

**The `orders` table needs one additional field:**
- `collab_total` int default 0 — sum of all selected collab prices (denormalized for easy display)
- `total_price` = `price` (gig base) + `collab_total`

---

## Gig setup (producer side)

On the producer's gig edit page (`/gig/edit` or `/innstillinger`):
- Section: "Artister du kan hente inn"
- Add artist: name, price, optional bio, optional avatar upload
- Can reorder, deactivate, or delete collab artists
- If a collab artist is a platform user: option to link their username (for profile linking on the gig page)

---

## Order form (customer side) — `/bestill/[gigId]`

After the customer fills in their brief:
- Section: "Lineup — velg artister (valgfritt)"
- Shows available active collab artists as selectable cards:
  ```
  [ ] Santi                 + kr 500
  [ ] dj pharao             + kr 800
  [ ] Young Nessa           + kr 350
  ```
- Running total updates as they select
- Final price shown prominently: "Totalt: kr X"
- Selected artists are passed to `POST /api/orders/create`

---

## Order creation flow update

`POST /api/orders/create` payload adds:
```typescript
{
  gigId: string,
  brief: string,             // encrypted server-side
  requestedDeliveryDate: string,
  selectedCollabIds: string[], // array of collab_artist IDs
}
```

Server-side:
1. Fetch gig price
2. Fetch selected collab_artists, validate they belong to the gig's producer and are active
3. Compute `collab_total = sum of prices`
4. Create PaymentIntent for `gig.price + collab_total`
5. Insert order with `price = gig.price`, `collab_total`, `total_price = price + collab_total`
6. Insert rows into `order_collabs` with snapshots of name + price

---

## Order detail page

Shows the selected lineup:
```
Valgt lineup:
• Santi — kr 500
• dj pharao — kr 800

Grunnpris: kr 2 000
Lineup: kr 1 300
Totalt: kr 3 300
```

---

## Gig public page — `/gig/[username]`

Shows:
- Gig title, description, base price, delivery time
- "Tilgjengelige artister" section listing active collab artists with names, bio, avatar, price
- "Bestill" button → order form

---

## Stripe payout split consideration

When an order has collabs, the **full payment** (base + collab total) goes into the platform account as usual. The **Transfer** on completion pays the beat producer 85% of the **base price only**, not the collab fees. The platform handles collab artist payouts separately (manual or via separate Transfers). This keeps the automated flow simple.

Alternative (more complex): create separate Transfers for each collab artist if they have Stripe accounts. This can be a v2 feature.

---

## Edge cases

- Collab artists can be deactivated after a gig is published — existing orders with that artist are unaffected (snapshot stored)
- If `selectedCollabIds` is empty, order proceeds at base price only
- The brief (song title) remains encrypted regardless of collabs selected
- Collab artists may or may not be platform users — the link is optional
