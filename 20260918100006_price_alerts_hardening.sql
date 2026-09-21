-- ============================================================
-- SKLOPI — PRICE ALERTS: ZAŠTITA (posle 20260918100005)
--
-- Pokreni u: Supabase → SQL Editor → New query
--
-- Šta ovo radi:
--   1. BEFORE INSERT trigger sada FORSIRA status='pending_confirmation'
--      i sva sistemska polja. Politika "anyone can create a price alert"
--      ima with check (true), pa je javni anon ključ do sada mogao da
--      upiše status='active' i zaobiđe double opt-in (worker bi slao
--      mejlove na tuđe adrese bez potvrde). Isto važi za created_at
--      (mogao je da se unapred postavi u prošlost i zaobiđe limit
--      od 5 alertova na 24h) i za tokene.
--   2. Dodaje confirmation_sent_at i confirmation_send_count.
--   3. Dodaje claim_confirmation_send(): atomična provera koju worker
--      zove pre slanja potvrdnog mejla (cooldown 10 min, max 3 slanja
--      po alertu). Poziva se samo iz workera (service_role).
-- ============================================================


-- ============================================================
-- 1. NOVE KOLONE
-- ============================================================

alter table public.price_alerts
  add column if not exists confirmation_sent_at timestamptz;

alter table public.price_alerts
  add column if not exists confirmation_send_count int not null default 0;

comment on column public.price_alerts.confirmation_sent_at is
  'Kad je poslednji put poslat potvrdni mejl (postavlja ga claim_confirmation_send).';

comment on column public.price_alerts.confirmation_send_count is
  'Koliko je potvrdnih mejlova poslato za ovaj alert. Worker staje na 3.';


-- ============================================================
-- 2. BEFORE INSERT: forsiraj sistemska polja + postojeći rate limit
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
   * KORAK 0 — klijent ne sme da bira sistemska polja.
   * Sve ovo se postavlja na serveru, šta god browser poslao.
   */
  new.status := 'pending_confirmation';
  new.confirmed_at := null;
  new.confirmation_token := gen_random_uuid();
  new.unsubscribe_token := gen_random_uuid();
  new.confirmation_sent_at := null;
  new.confirmation_send_count := 0;
  new.last_checked_at := null;
  new.created_at := now();

  /*
   * KORAK 1 — normalizacija (kao ranije)
   */
  new.email := lower(trim(new.email));
  new.dest := trim(new.dest);

  /*
   * KORAK 2 — rate limit: MAX 5 kreiranja u poslednja 24 sata
   * po email adresi (kao ranije).
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
   * KORAK 3 — rate limit: MAX 10 aktivnih alertova po email adresi
   * (kao ranije).
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

-- Trigger već postoji (trg_price_alerts_before_insert) i poziva istu
-- funkciju po imenu, pa ga ne pravimo ponovo.


-- ============================================================
-- 3. ATOMIČNO "REZERVISANJE" SLANJA POTVRDNOG MEJLA
--
-- Vraća true samo ako je alert još pending, nije poslato 3 puta i
-- poslednje slanje je starije od cooldown-a. UPDATE je atomičan, pa
-- dva istovremena poziva ne mogu oba da prođu.
-- ============================================================

create or replace function public.claim_confirmation_send(
  p_id uuid,
  p_cooldown interval default interval '10 minutes',
  p_max int default 3
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update public.price_alerts
     set confirmation_sent_at = now(),
         confirmation_send_count = confirmation_send_count + 1
   where id = p_id
     and status = 'pending_confirmation'
     and confirmation_send_count < p_max
     and (confirmation_sent_at is null
          or confirmation_sent_at < now() - p_cooldown)
  returning id into v_id;

  return v_id is not null;
end;
$$;

-- Samo worker (service_role) sme da je zove — ne browser.
revoke all on function public.claim_confirmation_send(uuid, interval, int)
  from public, anon, authenticated;

grant execute on function public.claim_confirmation_send(uuid, interval, int)
  to service_role;


-- ============================================================
-- KRAJ
-- ============================================================
