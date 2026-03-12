-- ============================================================
-- Russeartister.no — kjør dette i Supabase SQL Editor
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
create table public.profiles (
  id                         uuid references auth.users(id) on delete cascade primary key,
  username                   text unique not null,
  display_name               text not null,
  bio                        text not null default '',
  avatar_url                 text,
  stripe_account_id          text,
  stripe_onboarding_complete boolean not null default false,
  created_at                 timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiler er synlige for alle"
  on public.profiles for select using (true);

create policy "Brukere kan oppdatere sin egen profil"
  on public.profiles for update using (auth.uid() = id);

-- Auto-opprett profil når ny bruker registrerer seg
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'display_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── beats ────────────────────────────────────────────────────
create table public.beats (
  id                uuid not null default gen_random_uuid() primary key,
  producer_id       uuid not null references public.profiles(id) on delete cascade,
  title             text not null,
  description       text not null default '',
  genre             text not null,
  bpm               integer not null,
  key               text not null,
  tags              text[] not null default '{}',
  price             integer not null,        -- hele NOK
  cover_url         text,
  audio_preview_url text,
  project_file_url  text,
  is_published      boolean not null default false,
  created_at        timestamptz not null default now()
);

alter table public.beats enable row level security;

create policy "Publiserte beats er synlige for alle"
  on public.beats for select
  using (is_published = true or producer_id = auth.uid());

create policy "Produsenter kan laste opp sine egne beats"
  on public.beats for insert
  with check (producer_id = auth.uid());

create policy "Produsenter kan oppdatere sine egne beats"
  on public.beats for update
  using (producer_id = auth.uid());

create policy "Produsenter kan slette sine egne beats"
  on public.beats for delete
  using (producer_id = auth.uid());


-- ── purchases ────────────────────────────────────────────────
create table public.purchases (
  id                        uuid not null default gen_random_uuid() primary key,
  buyer_id                  uuid references public.profiles(id) on delete set null,
  beat_id                   uuid not null references public.beats(id) on delete restrict,
  amount_paid               integer not null,  -- hele NOK
  stripe_payment_intent_id  text not null unique,
  created_at                timestamptz not null default now()
);

alter table public.purchases enable row level security;

create policy "Kjøpere kan se sine egne kjøp"
  on public.purchases for select
  using (buyer_id = auth.uid());

-- Kun service_role kan skrive til purchases (via webhook)
create policy "Service role kan opprette kjøp"
  on public.purchases for insert
  with check (true);


-- ── Storage ──────────────────────────────────────────────────
-- Kjør dette i Supabase Dashboard → Storage → New bucket:
--   Navn: beat-covers    | Public: ja
--   Navn: beat-previews  | Public: ja

insert into storage.buckets (id, name, public)
values
  ('beat-covers', 'beat-covers', true),
  ('beat-previews', 'beat-previews', true),
  ('beat-files', 'beat-files', false)   -- prosjektfiler, privat
on conflict do nothing;

create policy "Alle kan lese beat-covers"
  on storage.objects for select
  using (bucket_id = 'beat-covers');

create policy "Innloggede brukere kan laste opp beat-covers"
  on storage.objects for insert
  with check (bucket_id = 'beat-covers' and auth.role() = 'authenticated');

create policy "Alle kan lese beat-previews"
  on storage.objects for select
  using (bucket_id = 'beat-previews');

create policy "Innloggede brukere kan laste opp beat-previews"
  on storage.objects for insert
  with check (bucket_id = 'beat-previews' and auth.role() = 'authenticated');

create policy "Innloggede brukere kan laste opp beat-files"
  on storage.objects for insert
  with check (bucket_id = 'beat-files' and auth.role() = 'authenticated');
