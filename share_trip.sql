-- ==========================================================
-- "Deljenje/planiranje sa prijateljima"
-- Vlasnik generiše link (share_token) za sačuvani aranžman; bilo ko
-- sa tim linkom može da VIDI aranžman i ostavi odgovor (Idem/Možda/
-- Ne mogu + komentar) BEZ svog naloga. Pristup ide isključivo preko
-- dve SECURITY DEFINER funkcije ispod — namerno NEMA opšte RLS SELECT
-- politike na "trips" po share_token, jer bi to (u kombinaciji sa
-- javnim anon ključem) omogućilo bilo kome da preko REST API-ja
-- izlista SVE deljene aranžmane SVIH korisnika, ne samo onaj čiji
-- token ima. Funkcije ispod vraćaju tačno jedan red, tačno onaj za
-- traženi token, i ništa osim njega.
-- ==========================================================

-- 1) Kolona za token (null dok korisnik ne klikne "Podeli")
alter table public.trips add column if not exists share_token uuid;
create unique index if not exists trips_share_token_idx
  on public.trips(share_token) where share_token is not null;

-- 2) Vlasnik mora moći da UPDATE-uje SVOJ red da bi postavio share_token.
--    Ako ova politika već postoji od ranije (npr. iz price-alert
--    migracije), ovaj blok je preskače bez greške.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trips'
      and policyname = 'users can update own trips'
  ) then
    create policy "users can update own trips" on public.trips
      for update using (auth.uid() = user_id);
  end if;
end $$;

-- 3) Tabela za RSVP odgovore prijatelja. Bez RLS select/insert politika
--    za anon/authenticated — pristup isključivo preko RPC funkcija ispod,
--    isti razlog kao gore (izbegavanje enumeracije tuđih odgovora).
create table if not exists public.trip_responses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  response text not null check (response in ('idem','mozda','ne_mogu')),
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists trip_responses_trip_id_idx on public.trip_responses(trip_id);
alter table public.trip_responses enable row level security;
-- Namerno nema "create policy" ovde — tabela je zaključana za direktan
-- pristup; sav pristup ide preko funkcija dole (SECURITY DEFINER ih
-- zaobilazi po dizajnu Postgres-a).

-- 4) Čitanje deljenog aranžmana preko tokena. Vraća SAMO polja bezbedna
--    za javnost — bez user_id (ne otkriva ko je vlasnik) i bez samog
--    share_token (ionako ga pozivalac već zna).
create or replace function public.get_shared_trip(p_token uuid)
returns table (
  id uuid, dest text, date_from date, date_to date,
  adults integer, selection jsonb, total numeric, created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select t.id, t.dest, t.date_from, t.date_to, t.adults, t.selection, t.total, t.created_at
  from public.trips t
  where t.share_token = p_token
  limit 1;
$$;
grant execute on function public.get_shared_trip(uuid) to anon, authenticated;

-- 5) Čitanje svih odgovora za deljeni aranžman (preko istog tokena, ne
--    preko trip_id — poziv sa fronta nikad ne zna interni trip id).
create or replace function public.get_trip_responses(p_token uuid)
returns table (name text, response text, comment text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select r.name, r.response, r.comment, r.created_at
  from public.trip_responses r
  join public.trips t on t.id = r.trip_id
  where t.share_token = p_token
  order by r.created_at asc;
$$;
grant execute on function public.get_trip_responses(uuid) to anon, authenticated;

-- 6) Dodavanje RSVP odgovora. Validacija (dužina imena, dozvoljene
--    vrednosti odgovora) ide OVDE, na serveru — ne veruje se frontendu.
create or replace function public.add_trip_response(
  p_token uuid, p_name text, p_response text, p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
begin
  if v_name = '' or length(v_name) > 60 then
    raise exception 'Ime mora imati između 1 i 60 karaktera.';
  end if;
  if p_response not in ('idem','mozda','ne_mogu') then
    raise exception 'Nevažeći odgovor.';
  end if;
  if v_comment is not null and length(v_comment) > 300 then
    raise exception 'Komentar je predugačak (max 300 karaktera).';
  end if;

  select id into v_trip_id from public.trips where share_token = p_token;
  if v_trip_id is null then
    raise exception 'Nevažeći ili istekao link za deljenje.';
  end if;

  insert into public.trip_responses (trip_id, name, response, comment)
  values (v_trip_id, v_name, p_response, v_comment);
end;
$$;
grant execute on function public.add_trip_response(uuid, text, text, text) to anon, authenticated;

