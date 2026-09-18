-- ============================================================
-- SKLOPI — PRICE ALERTS: DOUBLE OPT-IN (email potvrda)
--
-- Pokreni u:
-- Supabase → SQL Editor → New query
-- (POSLE price_alerts.sql — ova migracija menja tabelu koju on kreira)
--
-- Šta ovo radi:
--   1. dodaje 'pending_confirmation' kao status koji NIJE aktivan
--      (worker ga ne proverava dok se ne potvrdi)
--   2. status pri insert-u je sada 'pending_confirmation' po default-u,
--      NE 'active' — alert postaje aktivan tek kad korisnik klikne
--      link iz potvrdnog mejla
--   3. dodaje confirmation_token (za /go/confirm-alert) i confirmed_at
--   4. širi unique-active-alert index i na pending, da isti
--      email/dest/datumi/threshold ne mogu da naprave gomilu
--      nepotvrđenih duplikata dok čekaju na klik
-- ============================================================


-- ============================================================
-- 1. STATUS: dodaj 'pending_confirmation', promeni default
-- ============================================================

alter table public.price_alerts
  drop constraint if exists
  price_alerts_status_check;

alter table public.price_alerts
  add constraint
  price_alerts_status_check
  check (
    status in (
      'pending_confirmation',
      'active',
      'triggered',
      'cancelled'
    )
  );

alter table public.price_alerts
  alter column status
  set default 'pending_confirmation';


-- ============================================================
-- 2. NOVE KOLONE
-- ============================================================

alter table public.price_alerts
  add column if not exists
  confirmation_token uuid
    not null
    default gen_random_uuid();

alter table public.price_alerts
  add column if not exists
  confirmed_at timestamptz;

create index if not exists
  price_alerts_confirmation_token_idx
on public.price_alerts (confirmation_token);


-- ============================================================
-- 3. UNIQUE INDEX — proširi na pending_confirmation
--
-- Stari index (iz price_alerts.sql) je važio samo za status='active'.
-- Bez ovoga, korisnik koji ne potvrdi mejl bi mogao da napravi
-- neograničeno mnogo identičnih pending alertova (rate limit po broju
-- kreiranja u 24h i dalje važi, ali ovo je dodatna zaštita protiv
-- gomilanja duplikata koji čekaju potvrdu).
-- ============================================================

drop index if exists
  public.price_alerts_unique_active_alert_idx;

create unique index if not exists
  price_alerts_unique_active_alert_idx
on public.price_alerts (
  lower(email),
  dest,
  date_from,
  date_to,
  threshold,
  selection
)
where status in ('pending_confirmation', 'active');


-- ============================================================
-- 4. KOMENTARI
-- ============================================================

comment on column public.price_alerts.status is
  'pending_confirmation = čeka klik na link iz potvrdnog mejla; active = worker proverava; triggered = email uspešno poslat; cancelled = korisnik se odjavio (ili nikad nije potvrdio).';

comment on column public.price_alerts.confirmation_token is
  'Random UUID token za /go/confirm-alert — prelazak iz pending_confirmation u active. Odvojen od unsubscribe_token da stari unsubscribe linkovi (koji već mogu biti u starim redovima) ne mogu da se zloupotrebe za potvrdu.';

comment on column public.price_alerts.confirmed_at is
  'Kad je korisnik kliknuo na link za potvrdu. NULL dok je status pending_confirmation.';


-- ============================================================
-- KRAJ
-- ============================================================
