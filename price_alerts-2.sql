-- Pokreni u Supabase Dashboard → SQL Editor.
-- Ako tabela price_alerts već postoji (bez novih kolona), pokreni samo
-- blok "ALTER TABLE" ispod umesto celog fajla.

create table if not exists price_alerts (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  email text not null,
  dest text,
  kind text,              -- 'search' ili 'builder'
  tier text,               -- 'budget' | 'best' | 'comfort' (samo za kind='search')
  threshold numeric not null,
  current_total numeric,   -- poslednja izračunata cena (ažurira je Edge Function)
  params jsonb,            -- sve što je Edge Function-u treba da rekonstruiše cenu
  active boolean not null default true,   -- false pošto se alert jednom okine
  notified_at timestamptz  -- kad je mejl poslat
);

-- Ako tabela već postoji od ranije, samo dodaj nove kolone:
alter table price_alerts add column if not exists params jsonb;
alter table price_alerts add column if not exists active boolean not null default true;
alter table price_alerts add column if not exists notified_at timestamptz;

alter table price_alerts enable row level security;

-- Anonimni posetioci sajta smeju da UBACE novi alert...
drop policy if exists "anon can insert alerts" on price_alerts;
create policy "anon can insert alerts" on price_alerts
  for insert to anon with check (true);

-- ...ali ne smeju da ČITAJU tuđe redove (email adrese ostalih korisnika).
-- Edge Function čita/piše preko service_role ključa, koji zaobilazi RLS,
-- pa mu ova politika ne treba.
