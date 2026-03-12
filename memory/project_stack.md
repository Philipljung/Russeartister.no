---
name: Russeartister.no tech stack
description: Full stack setup for the russeartister.no marketplace project
type: project
---

Next.js 16 (App Router, TypeScript), TailwindCSS v4, Supabase (auth + database), Stripe Connect (destination charges, 15% application fee).

**Supabase project:** https://igdiftmnmgtcrlgcfbdo.supabase.co

**Key files:**
- `lib/supabase/client.ts` — browser Supabase client
- `lib/supabase/server.ts` — server Supabase client + service client
- `lib/supabase/types.ts` — Profile, Beat, Purchase types
- `lib/stripe.ts` — Stripe instance, APPLICATION_FEE_PERCENT (0.15), nokToOre()
- `middleware.ts` — auth session refresh
- `supabase/migrations.sql` — full schema to paste in Supabase SQL editor (NOT yet run)

**DB tables:** profiles, beats, purchases. Storage buckets: beat-covers, beat-previews.

**Why:** Norwegian marketplace for russesanger (beats, remakes, samples, presets). Sellers = music producers, buyers = russebuss groups and artists.

**How to apply:** When working on auth, data fetching, or payments, reference these files. SQL migrations have NOT been run yet — user still needs to paste supabase/migrations.sql in Supabase SQL editor.
