-- ============================================================
-- SKLOPI — SAČUVANI IZLETI ("trips")
--
-- Pokreni u: Supabase → SQL Editor → New query
-- MORA da se pokrene PRE share_trip.sql (ta migracija dodaje
-- share_token kolonu i politike na ovu tabelu).
--
-- Kolone odgovaraju tačno onome što app.js upisuje/čita:
--   - "Sačuvaj ponudu" (gotove ponude i "Pronađi svoj izlet")
--   - "Sačuvaj izlet" (builder)
--   - lista sačuvanih izleta (renderSavedTrips)
--   - brisanje sačuvanog izleta
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- 2. TABLE
-- ============================================================

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),

  created_at timestamptz
    not null
    default now(),

  -- Vlasnik (auth.users.id) — svaki izlet pripada tačno jednom
  -- prijavljenom korisniku.
  user_id uuid
    not null
    references auth.users(id)
    on delete cascade,

  dest text not null,

  date_from date not null,

  date_to date not null,

  adults int
    not null
    default 2,

  -- Ceo izbor (gotova ponuda ili builder) — isti oblik kao
  -- price_alerts.selection, da bi get_shared_trip (share_trip.sql)
  -- i price alert rekonstrukcija (pricing-core.js) mogli da dele
  -- istu logiku čitanja.
  selection jsonb not null,

  total numeric not null
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

create index if not exists
  trips_user_id_created_at_idx
on public.trips (user_id, created_at desc);


-- ============================================================
-- 4. BASIC VALIDATION
-- ============================================================

alter table public.trips
  drop constraint if exists
  trips_dest_length_check;

alter table public.trips
  add constraint
  trips_dest_length_check
  check (
    length(trim(dest)) between 1 and 100
  );


alter table public.trips
  drop constraint if exists
  trips_adults_check;

alter table public.trips
  add constraint
  trips_adults_check
  check (
    adults between 1 and 20
  );


alter table public.trips
  drop constraint if exists
  trips_total_check;

alter table public.trips
  add constraint
  trips_total_check
  check (
    total >= 0
    and total <= 100000
  );


alter table public.trips
  drop constraint if exists
  trips_dates_check;

alter table public.trips
  add constraint
  trips_dates_check
  check (
    date_to >= date_from
  );


-- ============================================================
-- 5. ROW LEVEL SECURITY
--
-- Korisnik sme da vidi/upiše/obriše SAMO svoje redove preko
-- normalnog anon/authenticated klijenta (app.js koristi sb.auth
-- sesiju, ne service_role). UPDATE politika (za postavljanje
-- share_token) dolazi iz share_trip.sql, ne odavde.
-- ============================================================

alter table public.trips enable row level security;

drop policy if exists "users can select own trips" on public.trips;
create policy "users can select own trips" on public.trips
  for select using (auth.uid() = user_id);

drop policy if exists "users can insert own trips" on public.trips;
create policy "users can insert own trips" on public.trips
  for insert with check (auth.uid() = user_id);

drop policy if exists "users can delete own trips" on public.trips;
create policy "users can delete own trips" on public.trips
  for delete using (auth.uid() = user_id);
