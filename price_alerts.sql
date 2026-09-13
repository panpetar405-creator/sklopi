-- ============================================================
-- SKOKNICA — PRICE ALERTS
-- Production version
--
-- Pokreni u:
-- Supabase → SQL Editor → New query
--
-- Ovaj fajl:
--   1. kreira price_alerts tabelu
--   2. uključuje RLS
--   3. dozvoljava anon/authenticated samo INSERT
--   4. dodaje server-side validaciju
--   5. dodaje rate limit po email adresi
--   6. sprečava duple aktivne alertove
--
-- Worker koristi service_role ključ i zaobilazi RLS.
-- ANON/PUBLIC ključ nikada ne sme biti service_role ključ.
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- 2. TABLE
-- ============================================================

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),

  created_at timestamptz
    not null
    default now(),

  -- Kontakt
  email text not null,

  -- Putovanje
  dest text not null,

  date_from date not null,

  date_to date not null,

  adults int
    not null
    default 2,

  -- Builder ili search izbor
  selection jsonb not null,

  -- Prag za alert
  threshold numeric not null,

  -- Poslednja poznata procena
  last_price numeric,

  last_checked_at timestamptz,

  -- active:
  --   Worker proverava alert
  --
  -- triggered:
  --   email je uspešno poslat
  --
  -- cancelled:
  --   korisnik se odjavio
  status text
    not null
    default 'active'
    check (
      status in (
        'active',
        'triggered',
        'cancelled'
      )
    ),

  -- Token za unsubscribe
  unsubscribe_token uuid
    not null
    default gen_random_uuid()
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

create index if not exists
  price_alerts_status_idx
on public.price_alerts (status);


create index if not exists
  price_alerts_unsub_idx
on public.price_alerts (unsubscribe_token);


create index if not exists
  price_alerts_created_at_idx
on public.price_alerts (created_at);


create index if not exists
  price_alerts_email_idx
on public.price_alerts (lower(email));


-- ============================================================
-- 4. BASIC VALIDATION
--
-- Ovo je dodatni DB sloj.
-- Frontend validacija nije dovoljna jer se API može pozvati
-- direktno bez korišćenja sajta.
-- ============================================================

alter table public.price_alerts
  drop constraint if exists
  price_alerts_email_format_check;

alter table public.price_alerts
  add constraint
  price_alerts_email_format_check
  check (
    length(trim(email)) between 5 and 254
    and
    trim(email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );


alter table public.price_alerts
  drop constraint if exists
  price_alerts_dest_length_check;

alter table public.price_alerts
  add constraint
  price_alerts_dest_length_check
  check (
    length(trim(dest)) between 1 and 100
  );


alter table public.price_alerts
  drop constraint if exists
  price_alerts_adults_check;

alter table public.price_alerts
  add constraint
  price_alerts_adults_check
  check (
    adults between 1 and 20
  );


alter table public.price_alerts
  drop constraint if exists
  price_alerts_threshold_check;

alter table public.price_alerts
  add constraint
  price_alerts_threshold_check
  check (
    threshold > 0
    and threshold <= 50000
  );


alter table public.price_alerts
  drop constraint if exists
  price_alerts_last_price_check;

alter table public.price_alerts
  add constraint
  price_alerts_last_price_check
  check (
    last_price is null
    or (
      last_price >= 0
      and last_price <= 50000
    )
  );


alter table public.price_alerts
  drop constraint if exists
  price_alerts_dates_check;

alter table public.price_alerts
  add constraint
  price_alerts_dates_check
  check (
    date_to >= date_from
  );


-- ============================================================
-- 5. NORMALIZE EMAIL
--
-- Sve email adrese se čuvaju lowercase + bez whitespace-a.
-- Tako:
--
-- Test@Email.com
-- test@email.com
--
-- tretiramo kao isti email.
-- ============================================================

create or replace function public.normalize_price_alert_email()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.email :=
    lower(trim(new.email));

  new.dest :=
    trim(new.dest);

  return new;
end;
$$;


drop trigger if exists
  trg_normalize_price_alert_email
on public.price_alerts;


create trigger
  trg_normalize_price_alert_email
before insert
on public.price_alerts
for each row
execute function public.normalize_price_alert_email();


-- ============================================================
-- 6. RATE LIMIT
--
-- Limit po EMAIL adresi:
--
-- MAX 5 novih alertova u poslednja 24h
-- MAX 10 aktivnih alertova ukupno
--
-- Ovo nije zamena za Cloudflare Turnstile/IP rate limiting,
-- ali sprečava najjednostavniji oblik abuse-a direktno na
-- Supabase INSERT endpointu.
-- ============================================================

create or replace function public.check_price_alert_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
  active_count integer;
begin

  /*
   * MAX 5 kreiranja u poslednja 24 sata
   */
  select count(*)
  into recent_count
  from public.price_alerts
  where lower(email) = lower(new.email)
    and created_at >= now() - interval '24 hours';

  if recent_count >= 5 then
    raise exception
      using
        errcode = 'P0001',
        message =
          'Previše price alertova za ovu email adresu. Pokušaj ponovo kasnije.';
  end if;


  /*
   * MAX 10 aktivnih alertova po email adresi.
   */
  select count(*)
  into active_count
  from public.price_alerts
  where lower(email) = lower(new.email)
    and status = 'active';

  if active_count >= 10 then
    raise exception
      using
        errcode = 'P0001',
        message =
          'Dostignut je maksimalan broj aktivnih alertova za ovu email adresu.';
  end if;


  return new;
end;
$$;


drop trigger if exists
  trg_price_alert_rate_limit
on public.price_alerts;


create trigger
  trg_price_alert_rate_limit
before insert
on public.price_alerts
for each row
execute function public.check_price_alert_rate_limit();


-- ============================================================
-- 7. DUPLICATE ACTIVE ALERT PROTECTION
--
-- Sprečava isti email da napravi potpuno isti aktivni alert
-- više puta.
--
-- Isti email + destinacija + datumi + threshold + selection
-- = jedan aktivan alert.
-- ============================================================

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
where status = 'active';


-- ============================================================
-- 8. RLS
-- ============================================================

alter table public.price_alerts
enable row level security;


-- Obriši staru policy ako postoji.
drop policy if exists
  "anyone can create a price alert"
on public.price_alerts;


-- ============================================================
-- 9. INSERT-ONLY POLICY
--
-- Browser sme samo da napravi alert.
--
-- Browser NE SME:
--   SELECT
--   UPDATE
--   DELETE
--
-- Worker koristi service_role i zato može da čita/ažurira.
-- ============================================================

create policy
  "anyone can create a price alert"
on public.price_alerts
for insert
to anon, authenticated
with check (
  true
);


-- ============================================================
-- 10. EXPLICITLY NO CLIENT READ/UPDATE/DELETE
--
-- Ne kreiramo:
--   SELECT policy
--   UPDATE policy
--   DELETE policy
--
-- RLS zato automatski odbija te operacije za anon/authenticated.
-- ============================================================


-- ============================================================
-- 11. COMMENTS
-- ============================================================

comment on table public.price_alerts is
  'Skoknica price alerts. Browser insert-only; Cloudflare Worker koristi service_role za proveru i slanje emailova.';

comment on column public.price_alerts.status is
  'active = worker proverava; triggered = email uspešno poslat; cancelled = korisnik se odjavio.';

comment on column public.price_alerts.unsubscribe_token is
  'Random UUID token koji omogućava unsubscribe bez login-a.';


-- ============================================================
-- KRAJ
-- ============================================================