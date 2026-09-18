-- ==========================================================
-- SKLOPI — deljeni (globalni) brojac pretraga/klikova
-- Pokreni ovo u Supabase Dashboard -> SQL Editor -> New query -> Run
-- ==========================================================

-- 1) Tabela sa jednim redom (id = 1) koji drzi trenutno stanje
create table if not exists public.site_stats (
  id int primary key default 1,
  searches int not null default 0,
  clicks int not null default 0,
  last_dest text,
  updated_at timestamptz not null default now()
);

-- Ubaci pocetni red ako ne postoji (id=1). Menjaj brojeve ovde ako zelis
-- da krenes od trenutnih vrednosti sa sajta umesto od nule.
insert into public.site_stats (id, searches, clicks, last_dest)
values (1, 182, 96, 'Atina')
on conflict (id) do nothing;

-- 2) RLS (Row Level Security) — dozvoli SVIMA da CITAJU red,
-- ali NE dozvoli direktan UPDATE/INSERT/DELETE sa klijenta
-- (to ide iskljucivo kroz funkcije ispod, koje su "security definer").
alter table public.site_stats enable row level security;

drop policy if exists "Public can read site_stats" on public.site_stats;
create policy "Public can read site_stats"
  on public.site_stats
  for select
  to anon, authenticated
  using (true);

-- 3) Funkcija: uvecaj brojac pretraga i upisi poslednju destinaciju.
-- SECURITY DEFINER znaci da radi sa pravima vlasnika (zaobilazi RLS
-- za upis), a spolja je dostupna samo kroz RPC poziv, atomicno.
create or replace function public.increment_search_stat(p_dest text)
returns table (searches int, clicks int, last_dest text)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.site_stats
  set searches = site_stats.searches + 1,
      last_dest = coalesce(p_dest, site_stats.last_dest),
      updated_at = now()
  where id = 1;

  return query
  select site_stats.searches, site_stats.clicks, site_stats.last_dest
  from public.site_stats
  where id = 1;
end;
$$;

-- 4) Funkcija: uvecaj brojac klikova na ponude.
create or replace function public.increment_click_stat()
returns table (searches int, clicks int, last_dest text)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.site_stats
  set clicks = site_stats.clicks + 1,
      updated_at = now()
  where id = 1;

  return query
  select site_stats.searches, site_stats.clicks, site_stats.last_dest
  from public.site_stats
  where id = 1;
end;
$$;

-- 5) Dozvoli anon/authenticated korisnicima da POZOVU ove funkcije
-- (sama funkcija je "security definer" pa i dalje samo ona sme da pise).
grant execute on function public.increment_search_stat(text) to anon, authenticated;
grant execute on function public.increment_click_stat() to anon, authenticated;

-- ==========================================================
-- Gotovo. Posle ovoga, provera na sajtu:
-- 1. Otvori sajt, otvori DevTools Console.
-- 2. Ne bi trebalo da vidis upozorenja koja pominju
--    "site_stats" ili "increment_search_stat/increment_click_stat".
-- 3. Uradi jednu pretragu / klikni na ponudu, pa osvezi stranicu
--    (ili deinstaliraj/reinstaliraj app) — brojac treba da ostane isti
--    (ili veci), ne da se vrati na 182/96.
-- ==========================================================
