-- ==========================================================
-- supabase/share_trip.sql
-- Implementira get_shared_trip / get_trip_responses / add_trip_response
-- koje zajedno.html već zove preko sb.rpc(...), ali koje do sada nisu
-- postojale u bazi.
--
-- Pretpostavka o postojećoj `trips` tabeli (na osnovu app.js insert-a
-- na liniji ~5178/5212): user_id, dest, date_from, date_to, adults,
-- selection jsonb, total, created_at. Ako se razlikuje, prilagodi.
--
-- SIGURNOSNA NAPOMENA: `trips.id` (primarni ključ) se NE koristi kao
-- token za deljenje — app.js je do sada slao sirov `id` u URL kao
-- ?trip=<id>, što je (a) pogrešan naziv parametra (zajedno.html čita
-- ?t=), pa link nikad nije radio, i (b) potencijalno pogodljivo/
-- nabrojivo ako id nije UUID. Ovde se uvodi poseban share_token
-- (nasumičan UUID, nezavisan od primarnog ključa) — link sad izgleda
-- kao zajedno.html?t=<share_token>, i to je ISPRAVLJENO i u app.js
-- (vidi patch niže u istom odgovoru).
-- ==========================================================

alter table public.trips
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists trips_share_token_idx
  on public.trips (share_token);

create table if not exists public.trip_responses (
  id bigint generated always as identity primary key,
  trip_id bigint not null references public.trips (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  response text not null check (response in ('idem', 'mozda', 'ne_mogu')),
  comment text check (comment is null or char_length(comment) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists trip_responses_trip_id_idx
  on public.trip_responses (trip_id);

-- RLS uključen, ali SVE tri funkcije ispod su SECURITY DEFINER, pa
-- rade nezavisno od RLS-a (kontrolišu pristup same, kroz token) —
-- to je namerno, isti obrazac koji je već opisan u komentaru na vrhu
-- zajedno.html ("Sav pristup bazi ide preko dve RPC funkcije... NEMA
-- direktnog .from('trips').select() ovde"). Direktan pristup tabelama
-- za anonimne korisnike ostaje zabranjen.
alter table public.trips enable row level security;
alter table public.trip_responses enable row level security;
-- (ne dodajem select/insert policy za anon ovde namerno — pristup
-- anonimnih posetilaca ide ISKLJUČIVO preko funkcija ispod)

-- ----------------------------------------------------------
-- get_shared_trip(p_token) — javni podaci o izletu za dati token.
-- Ne vraća user_id niti bilo šta o vlasniku izleta.
-- ----------------------------------------------------------
create or replace function public.get_shared_trip(p_token uuid)
returns table (
  dest text,
  date_from date,
  date_to date,
  adults int,
  selection jsonb,
  total numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select t.dest, t.date_from, t.date_to, t.adults, t.selection, t.total
  from public.trips t
  where t.share_token = p_token
  limit 1;
$$;

grant execute on function public.get_shared_trip(uuid) to anon, authenticated;

-- ----------------------------------------------------------
-- get_trip_responses(p_token) — lista RSVP odgovora za dati izlet.
-- ----------------------------------------------------------
create or replace function public.get_trip_responses(p_token uuid)
returns table (
  name text,
  response text,
  comment text
)
language sql
security definer
set search_path = public
stable
as $$
  select r.name, r.response, r.comment
  from public.trip_responses r
  join public.trips t on t.id = r.trip_id
  where t.share_token = p_token
  order by r.created_at asc;
$$;

grant execute on function public.get_trip_responses(uuid) to anon, authenticated;

-- ----------------------------------------------------------
-- add_trip_response(p_token, p_name, p_response, p_comment) — dodaje
-- RSVP odgovor. Vraća grešku ako token ne postoji (umesto tihog
-- upisa siročeta koji nikad neće biti prikazan).
-- ----------------------------------------------------------
create or replace function public.add_trip_response(
  p_token uuid,
  p_name text,
  p_response text,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id bigint;
begin
  select id into v_trip_id from public.trips where share_token = p_token limit 1;
  if v_trip_id is null then
    raise exception 'Nepoznat token za deljeni izlet';
  end if;

  if p_response not in ('idem', 'mozda', 'ne_mogu') then
    raise exception 'Nepoznata vrednost odgovora';
  end if;

  insert into public.trip_responses (trip_id, name, response, comment)
  values (v_trip_id, trim(p_name), p_response, nullif(trim(coalesce(p_comment, '')), ''));
end;
$$;

grant execute on function public.add_trip_response(uuid, text, text, text) to anon, authenticated;

-- Napomena: nema rate-limitinga ni CAPTCHA na add_trip_response —
-- svako ko ima link teoretski može da pošalje proizvoljno mnogo
-- odgovora u petlji. Za prototip je to prihvatljivo; pre javnog
-- lansiranja vredi dodati Supabase Edge Function rate limit ili
-- barem jedinstveno ograničenje (ime + trip_id) da se spreči spam.
