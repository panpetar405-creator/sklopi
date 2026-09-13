-- ============================================================
-- Skoknica вЂ” "Javi mi kad padne cena" (Price Alerts)
-- Pokreni ovo u Supabase SQL Editor-u (Project в†’ SQL Editor в†’ New query).
-- ============================================================

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Kontakt (nema naloga/lozinke вЂ” samo email, da prag za konverziju bude nizak)
  email text not null,

  -- Isti oblik konteksta kao builderCtx() u app.js
  dest text not null,
  date_from date not null,
  date_to date not null,
  adults int not null default 2,

  -- Isti oblik kao "selection" u trips tabeli:
  --   {kind:'builder', flightPref, hotelStars, ...}  ili
  --   {kind:'search', tier, tierLabel}
  selection jsonb not null,

  -- Prag koji korisnik postavlja ("javi mi kad padne ispod X")
  threshold numeric not null check (threshold > 0),

  -- Cena zabeleЕѕena pri poslednjoj proveri (poДЌetno = cena u trenutku kreiranja alerta)
  last_price numeric,
  last_checked_at timestamptz,

  -- 'active'    -> worker ga i dalje proverava
  -- 'triggered' -> mejl je poslat, alert se viЕЎe ne proverava (korisnik moЕѕe napraviti nov)
  -- 'cancelled' -> korisnik se odjavio preko linka u mejlu
  status text not null default 'active' check (status in ('active','triggered','cancelled')),

  -- NasumiДЌan token za "Odjavi me" link u mejlu вЂ” ne zahteva login da bi se ugasio alert
  unsubscribe_token uuid not null default gen_random_uuid()
);

create index if not exists price_alerts_status_idx on public.price_alerts (status);
create index if not exists price_alerts_unsub_idx on public.price_alerts (unsubscribe_token);

alter table public.price_alerts enable row level security;

-- Anonimni posetioci (i ulogovani) smeju SAMO da naprave alert вЂ” ne mogu da
-- ДЌitaju/menjaju tuД‘e (ni svoje) redove preko klijenta. Sve ДЌitanje/pisanje
-- posle kreiranja radi iskljuДЌivo Cloudflare Worker preko service_role kljuДЌa
-- (koji zaobilazi RLS), nikad anon kljuДЌ iz browsera.
drop policy if exists "anyone can create a price alert" on public.price_alerts;
create policy "anyone can create a price alert"
  on public.price_alerts
  for insert
  to anon, authenticated
  with check (true);

-- Namerno NEMA select/update/delete policy za anon/authenticated вЂ”
-- bez policy-ja, RLS podrazumevano odbija pristup, ЕЎto je ovde upravo cilj:
-- korisnik ne treba (niti sme) da vidi tuД‘e email adrese/pragove iz browsera.

-- Napomena o "Odjavi me" linku: poЕЎto klijent nema select/update pravo,
-- unsubscribe stranica ne moЕѕe direktno da aЕѕurira ovu tabelu preko
-- supabase-js anon klijenta. Umesto toga, link u mejlu vodi na mali
-- Cloudflare Worker endpoint (vidi worker/price-alert-worker.js,
-- ruta /unsubscribe?token=...) koji koristi service_role kljuДЌ da
-- postavi status='cancelled'. Tako svi upisi u ovu tabelu prolaze
-- ili kroz RLS insert-only policy, ili kroz server sa punim pristupom вЂ”
-- nikad kroz anon select/update.