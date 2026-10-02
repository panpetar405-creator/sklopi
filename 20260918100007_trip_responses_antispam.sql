-- ==========================================================
-- Anti-spam za RSVP odgovore na deljenim aranžmanima (zajedno.html)
--
-- PROBLEM: add_trip_response() je bila otvorena za anon ključ, a taj ključ je JAVAN
-- (config.js). Svako je mogao da pozove funkciju direktno iz konzole u petlji i
-- zatrpa stranicu odgovora (ili napuni bazu), mimo bilo kakvog limita sa fronta.
--
-- REŠENJE (dva sloja):
--   1) Direktan poziv sa anon/authenticated ključem se UKIDA. Upisivanje ide samo
--      preko Worker-a (/go/trip-response) koji ima rate limit po IP-u, honeypot,
--      (opciono) Cloudflare Turnstile — i zove ovu bazu kao service_role.
--   2) Ograničenja i u samoj bazi (važe i ako neko nekako zaobiđe Worker):
--        - max 100 odgovora po aranžmanu
--        - max 8 odgovora po (aranžman + IP hash) na sat
--        - jedno ime po aranžmanu (case-insensitive); isto ime sa iste IP adrese
--          samo AŽURIRA raniji odgovor ("predomislio sam se"), a sa druge IP adrese
--          se odbija (niko ne može da prepiše tuđ odgovor)
--        - odbijaju se linkovi/domeni u imenu i komentaru (tipičan spam)
--        - kontrolni karakteri se zamenjuju razmakom
--
-- REDOSLED DEPLOY-A (važno): 1) objavi sajt + Worker (novi zajedno.html zove /go/trip-response),
-- 2) tek onda pokreni ovaj SQL. Ako ga pokreneš prvi, stari zajedno.html prestaje da radi.
-- ==========================================================

-- 0) Sirovi IP se NE čuva — samo salted SHA-256 (računa ga Worker).
alter table public.trip_responses add column if not exists ip_hash text;

-- 1) Jedno ime po aranžmanu. Prvo očisti postojeće duplikate (ostaje NAJNOVIJI odgovor po imenu),
--    inače bi unique indeks pao.
delete from public.trip_responses a
using public.trip_responses b
where a.trip_id = b.trip_id
  and lower(a.name) = lower(b.name)
  and (a.created_at, a.id) < (b.created_at, b.id);

create unique index if not exists trip_responses_trip_name_uidx
  on public.trip_responses (trip_id, lower(name));
create index if not exists trip_responses_trip_ip_idx
  on public.trip_responses (trip_id, ip_hash, created_at desc);

-- 2) Nova funkcija — vraća jsonb {status, message?} umesto izuzetaka, da Worker može
--    da mapira statuse na HTTP kodove.
create or replace function public.add_trip_response_v2(
  p_token uuid,
  p_name text,
  p_response text,
  p_comment text default null,
  p_ip_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c_max_per_trip constant int := 100;
  c_max_per_ip_hour constant int := 8;
  -- linkovi, "www.", "@domen.tld" i najčešći spam TLD-ovi
  c_link_re constant text := '(https?:|://|www\.|@[a-z0-9-]+\.[a-z]{2,}|\m[a-z0-9-]+\.(com|net|org|ru|xyz|top|info|biz|io|co|me|cc|ly|site|online|club|shop|click)\M)';
  v_trip_id uuid;
  v_name text := regexp_replace(trim(coalesce(p_name, '')), '[[:cntrl:]]+', ' ', 'g');
  v_comment text := nullif(regexp_replace(trim(coalesce(p_comment, '')), '[[:cntrl:]]+', ' ', 'g'), '');
  v_existing_id uuid;
  v_existing_ip text;
  v_count int;
begin
  if v_name = '' or length(v_name) > 60 then
    return jsonb_build_object('status', 'invalid', 'message', 'Ime mora imati između 1 i 60 karaktera.');
  end if;
  if p_response is null or p_response not in ('idem', 'mozda', 'ne_mogu') then
    return jsonb_build_object('status', 'invalid', 'message', 'Nevažeći odgovor.');
  end if;
  if v_comment is not null and length(v_comment) > 300 then
    return jsonb_build_object('status', 'invalid', 'message', 'Komentar je predugačak (max 300 karaktera).');
  end if;
  if v_name ~* c_link_re or (v_comment is not null and v_comment ~* c_link_re) then
    return jsonb_build_object('status', 'spam', 'message', 'Linkovi nisu dozvoljeni u imenu i komentaru.');
  end if;

  select id into v_trip_id from public.trips where share_token = p_token;
  if v_trip_id is null then
    return jsonb_build_object('status', 'invalid_token', 'message', 'Nevažeći ili istekao link za deljenje.');
  end if;

  -- Serijalizuje upise za isti aranžman, da dva istovremena zahteva ne probiju limite.
  perform pg_advisory_xact_lock(hashtext(v_trip_id::text));

  if p_ip_hash is not null then
    select count(*) into v_count from public.trip_responses
      where trip_id = v_trip_id and ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
    if v_count >= c_max_per_ip_hour then
      return jsonb_build_object('status', 'rate_limited', 'message', 'Previše odgovora u kratkom roku. Pokušaj kasnije.');
    end if;
  end if;

  select id, ip_hash into v_existing_id, v_existing_ip
    from public.trip_responses where trip_id = v_trip_id and lower(name) = lower(v_name);

  if v_existing_id is not null then
    -- Isto ime: sme da prepiše samo isti pošiljalac (isti IP hash).
    if p_ip_hash is not null and v_existing_ip is not distinct from p_ip_hash then
      update public.trip_responses
         set response = p_response, comment = v_comment, created_at = now()
       where id = v_existing_id;
      return jsonb_build_object('status', 'updated');
    end if;
    return jsonb_build_object('status', 'name_taken', 'message', 'Neko sa tim imenom je već odgovorio — dodaj prezime ili inicijal.');
  end if;

  select count(*) into v_count from public.trip_responses where trip_id = v_trip_id;
  if v_count >= c_max_per_trip then
    return jsonb_build_object('status', 'full', 'message', 'Ovaj aranžman je dostigao maksimalan broj odgovora.');
  end if;

  insert into public.trip_responses (trip_id, name, response, comment, ip_hash)
  values (v_trip_id, v_name, p_response, v_comment, p_ip_hash);
  return jsonb_build_object('status', 'ok');
end;
$$;

-- 3) Samo Worker (service_role) sme da upisuje. Stara funkcija se zaključava (ne briše — lakši rollback).
revoke all on function public.add_trip_response_v2(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.add_trip_response_v2(uuid, text, text, text, text) to service_role;

revoke all on function public.add_trip_response(uuid, text, text, text) from public, anon, authenticated;
-- ROLLBACK (ako treba da vratiš staro ponašanje):
--   grant execute on function public.add_trip_response(uuid, text, text, text) to anon, authenticated;
