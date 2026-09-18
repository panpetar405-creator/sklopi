-- ============================================================
-- SKLOPI — PRICE ALERTS
-- Production version (hardened)
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
-- 5. NORMALIZE + RATE LIMIT (jedna eksplicitna BEFORE INSERT funkcija)
--
-- VAŽNO — zašto su ove dve stvari spojene u JEDNU funkciju/trigger
-- umesto dva odvojena triggera:
--
-- Postgres izvršava više BEFORE INSERT triggera na istoj tabeli
-- ALFABETSKI PO IMENU TRIGGERA, ne po redosledu kreiranja. U ranijoj
-- verziji ovog fajla, normalizacija (trg_normalize_price_alert_email)
-- i rate limit (trg_price_alert_rate_limit) su bili odvojeni triggeri
-- koji su slučajno ispravno radili u tom redosledu samo zato što "n"
-- dolazi pre "p" u alfabetu. Da neko kasnije doda ili preimenuje
-- trigger, redosled bi se tiho promenio i rate limit/duplicate check
-- bi mogao da poredi email pre normalizacije (npr. "Test@Email.com"
-- vs "test@email.com" tretirani kao različiti).
--
-- Spajanjem u jednu funkciju, redosled koraka je eksplicitan u kodu
-- i ne zavisi od imena triggera.
-- ============================================================

create or replace function public.price_alerts_before_insert()
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
   * KORAK 1 — normalizacija
   *
   * Email lowercase + trim, dest trim. Ovo mora da se desi PRVO,
   * pre bilo kakve provere rate limita ili duplikata, jer se sve
   * dalje provere oslanjaju na normalizovane vrednosti.
   */
  new.email := lower(trim(new.email));
  new.dest := trim(new.dest);


  /*
   * KORAK 2 — rate limit: MAX 5 kreiranja u poslednja 24 sata
   * po email adresi.
   */
  select count(*)
  into recent_count
  from public.price_alerts
  where lower(email) = new.email
    and created_at >= now() - interval '24 hours';

  if recent_count >= 5 then
    raise exception
      using
        errcode = 'P0001',
        message =
          'Previše price alertova za ovu email adresu. Pokušaj ponovo kasnije.';
  end if;


  /*
   * KORAK 3 — rate limit: MAX 10 aktivnih alertova po email adresi.
   */
  select count(*)
  into active_count
  from public.price_alerts
  where lower(email) = new.email
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
  trg_normalize_price_alert_email
on public.price_alerts;

drop trigger if exists
  trg_price_alert_rate_limit
on public.price_alerts;

drop trigger if exists
  trg_price_alerts_before_insert
on public.price_alerts;

create trigger
  trg_price_alerts_before_insert
before insert
on public.price_alerts
for each row
execute function public.price_alerts_before_insert();


-- ============================================================
-- 6. DUPLICATE ACTIVE ALERT PROTECTION
--
-- Sprečava isti email da napravi potpuno isti aktivni alert
-- više puta.
--
-- Isti email + destinacija + datumi + threshold + selection
-- = jedan aktivan alert.
--
-- NAPOMENA (poznato ograničenje, namerno nije rešavano ovde):
-- jsonb poređenje je striktno — dva alerta koja su semantički ista
-- ali imaju npr. jedno polje izostavljeno u 'selection' umesto
-- eksplicitno null, neće biti prepoznata kao duplikat. Ako to
-- postane problem u praksi, rešenje je normalizovati 'selection'
-- na fiksan skup ključeva pre insert-a (u istoj trigger funkciji
-- iznad), a ne menjati sam unique index.
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
-- 7. RLS
-- ============================================================

alter table public.price_alerts
enable row level security;


-- Obriši staru policy ako postoji.
drop policy if exists
  "anyone can create a price alert"
on public.price_alerts;


-- ============================================================
-- 8. INSERT-ONLY POLICY
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
-- 9. EXPLICITLY NO CLIENT READ/UPDATE/DELETE
--
-- Ne kreiramo:
--   SELECT policy
--   UPDATE policy
--   DELETE policy
--
-- RLS zato automatski odbija te operacije za anon/authenticated.
-- ============================================================


-- ============================================================
-- 10. COMMENTS
-- ============================================================

comment on table public.price_alerts is
  'SKLOPI price alerts. Browser insert-only; Cloudflare Worker koristi service_role za proveru i slanje emailova.';

comment on column public.price_alerts.status is
  'active = worker proverava; triggered = email uspešno poslat; cancelled = korisnik se odjavio.';

comment on column public.price_alerts.unsubscribe_token is
  'Random UUID token koji omogućava unsubscribe bez login-a.';

comment on function public.price_alerts_before_insert() is
  'Jedinstvena BEFORE INSERT funkcija koja EKSPLICITNO, u fiksnom redosledu, radi: 1) normalizaciju email/dest, 2) rate limit po broju kreiranja u 24h, 3) rate limit po broju aktivnih alertova. Namerno spojeno u jednu funkciju umesto više triggera da redosled izvršavanja ne zavisi od (alfabetskog) imena triggera.';


-- ============================================================
-- KRAJ
-- ============================================================
