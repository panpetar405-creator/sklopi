-- ==========================================================
-- SKLOPI — deljeni (globalni) brojači: pretrage, klikovi,
-- poslednja destinacija. Jedan red (id=1) koji svi posetioci dele.
--
-- Pokreni ovo JEDNOM u Supabase Dashboard -> SQL Editor -> New query.
-- ==========================================================

-- 1) Tabela sa jednim redom
create table if not exists public.site_stats (
  id smallint primary key default 1,
  searches bigint not null default 0,
  clicks bigint not null default 0,
  last_dest text,
  updated_at timestamptz not null default now(),
  constraint site_stats_single_row check (id = 1)
);

insert into public.site_stats (id) values (1)
on conflict (id) do nothing;

-- 2) RLS — svi mogu da ČITAJU brojače, ali NIKO ne može direktno
--    da piše u tabelu (pisanje ide samo kroz funkcije ispod).
alter table public.site_stats enable row level security;

drop policy if exists "Public can read site_stats" on public.site_stats;
create policy "Public can read site_stats"
  on public.site_stats for select
  using (true);

-- 3) Funkcije za atomično uvećanje (SECURITY DEFINER = rade i pored RLS,
--    a pozivalac ne može da piše proizvoljne vrednosti, samo +1).
create or replace function public.increment_search_stat(p_dest text default null)
returns table(searches bigint, clicks bigint, last_dest text)
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
  from public.site_stats where id = 1;
end;
$$;

create or replace function public.increment_click_stat()
returns table(searches bigint, clicks bigint, last_dest text)
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
  from public.site_stats where id = 1;
end;
$$;

-- 4) Dozvole — anon (nulogovani posetioci) sme da čita i da zove ove
--    dve funkcije, ništa više.
grant select on public.site_stats to anon, authenticated;
grant execute on function public.increment_search_stat(text) to anon, authenticated;
grant execute on function public.increment_click_stat() to anon, authenticated;
