-- ==========================================================
-- Dopuna price_alerts tabele + infrastruktura da alert za pad
-- cene STVARNO radi (do sada je postojao samo INSERT sa frontenda,
-- ništa nije čitalo taj red niti slalo mejl).
--
-- Pretpostavlja da price_alerts tabela već postoji (pravi je
-- postojeći insert u app.js: email, dest, date_from, date_to,
-- adults, selection jsonb, threshold, last_price). Ako imena kolona
-- kod tebe ne odgovaraju tačno ovome, prilagodi pre pokretanja —
-- autor originalnog koda je sam naveo da nije 100% siguran u imena
-- (vidi komentar u app.js iznad Supabase inicijalizacije).
-- ==========================================================

alter table public.price_alerts
  add column if not exists active boolean not null default true,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists last_checked_at timestamptz,
  add column if not exists triggered_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

create index if not exists price_alerts_active_idx
  on public.price_alerts (active, last_checked_at)
  where active = true;

create unique index if not exists price_alerts_unsub_token_idx
  on public.price_alerts (unsubscribe_token);

-- RLS: ostaje uključen. Insert sa frontenda (anon/authenticated preko
-- sb.from('price_alerts').insert(...)) mora ostati dozvoljen — proveri da
-- već postoji slična policy; ako ne postoji, otkomentariši:
-- create policy "anyone can create an alert"
--   on public.price_alerts for insert
--   to authenticated
--   with check (true);
--
-- Select/update za edge funkciju ide preko service_role ključa, koji
-- zaobilazi RLS po difoltu — nije potrebna posebna policy za to, ali
-- OBAVEZNO se uveri da NIJEDNA postojeća policy ne dozvoljava običnom
-- korisniku da čita tuđe redove (email drugih korisnika) ili menja
-- threshold/active bilo kog reda osim preko unsubscribe tokena.

-- ==========================================================
-- Zakazivanje: pg_cron + pg_net pozivaju Edge Function na sat vremena.
-- Zahteva da su ekstenzije pg_cron i pg_net uključene (Database →
-- Extensions u Supabase dashboardu), i da je service role ključ +
-- URL projekta sačuvan u Vault-u (koraci ispod su OBAVEZNI, ne rade
-- sami od sebe):
--
--   1) select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   2) select vault.create_secret('<service-role-key>', 'service_role_key');
--   3) pokreni select cron.schedule(...) ispod (zameni <project-ref>).
--
-- Bez ovoga, migracija samo priprema šemu — cron job se NE pravi sam.
-- ==========================================================

-- select cron.schedule(
--   'check-price-alerts-hourly',
--   '0 * * * *',
--   $$
--   select net.http_post(
--     url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/check-price-alerts',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
