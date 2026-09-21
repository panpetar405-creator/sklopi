/* ==========================================================
   SKLOPI — Price Alert Worker

   Radi tri stvari:
   1) Cron proverava aktivne price_alerts i šalje email
      kada procenjena cena padne ispod praga.
   2) /unsubscribe?token=... gasi alert.
   3) /api/flights — pretraga letova preko Duffel API-ja.

   ENV / SECRETS:
     SUPABASE_URL
     SUPABASE_SERVICE_ROLE_KEY
     RESEND_API_KEY
     ALERT_FROM_EMAIL
     SITE_URL
     DUFFEL_API_KEY
========================================================== */

import { computeAlertPrice } from './pricing-core.js';

const TIER_LABELS = {
  budget: 'Budget',
  best: 'Best Value',
  comfort: 'Comfort'
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      (url.pathname === '/go/unsubscribe' ||
        url.pathname === '/unsubscribe') &&
      request.method === 'GET'
    ) {
      return handleUnsubscribe(url, env);
    }

    if (
      (url.pathname === '/go/confirm-alert' ||
        url.pathname === '/confirm-alert') &&
      request.method === 'GET'
    ) {
      return handleConfirmAlert(url, env);
    }

    if (
      url.pathname === '/go/send-confirmation' ||
      url.pathname === '/send-confirmation'
    ) {
      if (request.method === 'OPTIONS') {
        return corsPreflightResponse(env);
      }
      if (request.method === 'POST') {
        return handleSendConfirmation(request, env);
      }
    }

    if (url.pathname === '/api/flights') {
      if (request.method === 'OPTIONS') {
        return corsPreflightResponse(env);
      }
      if (request.method === 'GET') {
        return handleFlightSearch(url, env);
      }
    }

    return new Response('SKLOPI price-alert worker.', {
      status: 200
    });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkAllAlerts(env));
  }
};

/* ==========================================================
   FLIGHT SEARCH (Duffel)

   GET /api/flights?origin=BEG&destination=ATH&departure_date=2026-10-01
       &return_date=2026-10-08&adults=2

   Test mode (duffel_test_... ključ) vraća sandbox ponude
   ("Duffel Airways") — pravi podaci tek sa live ključem.
========================================================== */
async function handleFlightSearch(url, env) {
  const cors = corsHeaders(env);
  const origin = url.searchParams.get('origin');
  const destination = url.searchParams.get('destination');
  const departureDate = url.searchParams.get('departure_date');
  const returnDate = url.searchParams.get('return_date');
  const adults = Math.max(1, Number(url.searchParams.get('adults') || '1'));

  if (!origin || !destination || !departureDate) {
    return new Response(
      JSON.stringify({
        error:
          'Nedostaju obavezni parametri: origin, destination, departure_date.'
      }),
      {
        status: 400,
        headers: { ...cors, 'content-type': 'application/json; charset=utf-8' }
      }
    );
  }

  const slices = [{ origin, destination, departure_date: departureDate }];
  if (returnDate) {
    slices.push({
      origin: destination,
      destination: origin,
      departure_date: returnDate
    });
  }
  const passengers = Array.from({ length: adults }, () => ({ type: 'adult' }));

  try {
    const res = await fetch(
      'https://api.duffel.com/air/offer_requests?return_offers=true',
      {
        method: 'POST',
        headers: {
         Authorization: `Bearer ${env.DUFFEL_API_KEY}`, 
          'Duffel-Version': 'v2',
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip'
        },
        body: JSON.stringify({
          data: { slices, passengers, cabin_class: 'economy' }
        })
      }
    );

    const payload = await res.json();

    if (!res.ok) {
      console.error(
        '[price-alert-worker] Duffel greška:',
        JSON.stringify(payload)
      );
      return new Response(
        JSON.stringify({ error: 'Duffel API greška.', details: payload }),
        {
          status: 502,
          headers: {
            ...cors,
            'content-type': 'application/json; charset=utf-8'
          }
        }
      );
    }

    const offers = (payload.data && payload.data.offers) || [];
    const simplified = offers.slice(0, 5).map((offer) => ({
      id: offer.id,
      total_amount: offer.total_amount,
      total_currency: offer.total_currency,
      airline: offer.owner && offer.owner.name,
      airline_iata: offer.owner && offer.owner.iata_code,
      slices: (offer.slices || []).map((slice) => ({
        origin: slice.origin && slice.origin.iata_code,
        destination: slice.destination && slice.destination.iata_code,
        departing_at:
          slice.segments && slice.segments[0] && slice.segments[0].departing_at,
        arriving_at:
          slice.segments &&
          slice.segments[slice.segments.length - 1] &&
          slice.segments[slice.segments.length - 1].arriving_at
      }))
    }));

    return new Response(JSON.stringify({ offers: simplified }), {
      status: 200,
      headers: {
        ...cors,
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=300'
      }
    });
  } catch (err) {
    console.error('[price-alert-worker] Duffel network greška:', err);
    return new Response(JSON.stringify({ error: 'Greška servera.' }), {
      status: 500,
      headers: { ...cors, 'content-type': 'application/json; charset=utf-8' }
    });
  }
}

/* ==========================================================
   UNSUBSCRIBE
========================================================== */
async function handleUnsubscribe(url, env) {
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Nedostaje token.', {
      status: 400
    });
  }

  /*
   * Prefer: return=representation — bez ovoga, PostgREST na PATCH
   * vraća 200/204 i kad NIJEDAN red ne odgovara filteru (npr. token
   * ne postoji ili je već iskorišćen), pa "res.ok" ne bi razlikovao
   * uspešan unsubscribe od nepostojećeg tokena. Sa representation
   * dobijamo nazad niz izmenjenih redova i možemo da proverimo
   * da li je zaista nešto pogođeno.
   */
  const res = await sbFetch(
    env,
    `price_alerts?unsubscribe_token=eq.${encodeURIComponent(token)}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        status: 'cancelled'
      })
    }
  );

  if (!res.ok) {
    console.error(
      '[price-alert-worker] unsubscribe update nije uspeo:',
      await safeResponseText(res)
    );
    return new Response(
      'Došlo je do greške. Pokušaj ponovo kasnije.',
      { status: 500 }
    );
  }

  const updatedRows = await res.json();

  if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
    return new Response(
      'Alert nije pronađen (link je možda već iskorišćen ili istekao).',
      { status: 404 }
    );
  }

  return new Response(
    `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SKLOPI — Alert ugašen</title>
</head>
<body style="font-family:sans-serif;max-width:480px;margin:60px auto;text-align:center;color:#16242A;padding:20px;">
<h2>Alert je ugašen.</h2>
<p>
Više nećeš dobijati obaveštenja za ovu pretragu.
Možeš napraviti novi alert bilo kada na Skoknici.
</p>
<a
href="${escapeHtml(env.SITE_URL || 'https://sklopi.rs')}"
style="color:#8f6423;"
>
← Nazad na Skoknicu
</a>
</body>
</html>`,
    {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      }
    }
  );
}

/* ==========================================================
   CONFIRM ALERT (double opt-in)
   Klik na link iz potvrdnog mejla — prebacuje alert iz
   pending_confirmation u active. Worker koristi service_role,
   pa ovo radi bez obzira na RLS (browser sam ne može ni da
   pročita ni da promeni status — vidi price_alerts.sql).
========================================================== */
async function handleConfirmAlert(url, env) {
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Nedostaje token.', {
      status: 400
    });
  }

  const res = await sbFetch(
    env,
    `price_alerts?confirmation_token=eq.${encodeURIComponent(token)}` +
      `&status=eq.pending_confirmation`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        status: 'active',
        confirmed_at: new Date().toISOString()
      })
    }
  );

  if (!res.ok) {
    console.error(
      '[price-alert-worker] confirm update nije uspeo:',
      await safeResponseText(res)
    );
    return new Response(
      'Došlo je do greške. Pokušaj ponovo kasnije.',
      { status: 500 }
    );
  }

  const updatedRows = await res.json();

  if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
    /*
     * Token ne postoji, ili je alert već potvrđen/otkazan ranije —
     * u oba slučaja nema šta dalje da se PATCH-uje (status filter
     * gore je eq.pending_confirmation, pa drugi pokušaj klika na
     * isti link legitimno ne pogađa nijedan red).
     */
    return new Response(
      'Link je nevažeći, već iskorišćen, ili je alert u međuvremenu otkazan.',
      { status: 404 }
    );
  }

  const siteUrl = env.SITE_URL || 'https://sklopi.rs';

  return new Response(
    `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SKLOPI — Alert potvrđen</title>
</head>
<body style="font-family:sans-serif;max-width:480px;margin:60px auto;text-align:center;color:#16242A;padding:20px;">
<h2>Alert je aktiviran ✅</h2>
<p>
Javićemo ti mejlom kad procenjena cena padne ispod praga
koji si postavio/la.
</p>
<a
href="${escapeHtml(siteUrl)}"
style="color:#8f6423;"
>
← Nazad na Skoknicu
</a>
</body>
</html>`,
    {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      }
    }
  );
}

/* ==========================================================
   SEND CONFIRMATION EMAIL (pozvano sa sajta odmah posle insert-a)
   Browser sme samo INSERT u price_alerts (vidi RLS u
   price_alerts.sql) — nema SELECT, pa ne može sam da pročita
   confirmation_token novog reda da bi napravio link. Umesto
   toga, sajt pozove OVAJ endpoint sa istim poljima koja je
   upravo upisao; worker (service_role) pronađe TAJ red i pošalje
   mejl sa pravim tokenom.
========================================================== */
async function handleSendConfirmation(request, env) {
  const cors = corsHeaders(env);

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Neispravan JSON.', { status: 400, headers: cors });
  }

  const { email, dest, date_from, date_to, threshold } = body || {};

  if (!email || !dest || !date_from || !date_to || !threshold) {
    return new Response(
      'Nedostaju obavezna polja (email, dest, date_from, date_to, threshold).',
      { status: 400, headers: cors }
    );
  }

  /*
   * Nalazimo NAJNOVIJI pending_confirmation red koji odgovara
   * ovim poljima — dovoljno precizno jer je isti email/dest/datumi/
   * threshold jedinstven dok je pending (vidi unique index u
   * 20260918100005_price_alerts_double_optin.sql). Ako korisnik
   * dupli-klikne "Postavi alert" pre nego što stigne mejl, insert #2
   * bi pao na unique constraint na serveru pre nego što ovde
   * stignemo — ovaj endpoint uvek gleda ono što STVARNO postoji u
   * bazi, ne ono što je klijent poslao kao "istina".
   */
  const lookupPath =
    `price_alerts?email=eq.${encodeURIComponent(String(email).toLowerCase().trim())}` +
    `&dest=eq.${encodeURIComponent(dest)}` +
    `&date_from=eq.${encodeURIComponent(date_from)}` +
    `&date_to=eq.${encodeURIComponent(date_to)}` +
    `&threshold=eq.${encodeURIComponent(threshold)}` +
    `&status=eq.pending_confirmation` +
    `&order=created_at.desc&limit=1&select=*`;

  const res = await sbFetch(env, lookupPath, {
    headers: { Prefer: 'return=representation' }
  });

  if (!res.ok) {
    console.error(
      '[price-alert-worker] lookup za potvrdni mejl nije uspeo:',
      await safeResponseText(res)
    );
    return new Response('Greška servera.', { status: 500, headers: cors });
  }

  const rows = await res.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return new Response(
      'Alert nije pronađen (možda je već potvrđen ili istekao).',
      { status: 404, headers: cors }
    );
  }

  /*
   * Zaštita od zloupotrebe (email bombing): pre slanja "rezervišemo"
   * slanje u bazi. claim_confirmation_send (vidi
   * 20260918100006_price_alerts_hardening.sql) atomično proverava
   * cooldown (10 min) i maksimum (3 mejla po alertu). Neuspelo slanje
   * takođe troši jedan pokušaj — namerno, radi jednostavnosti.
   */
  const claim = await sbFetch(env, 'rpc/claim_confirmation_send', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ p_id: rows[0].id })
  });

  if (!claim.ok) {
    console.error(
      '[price-alert-worker] claim_confirmation_send nije uspeo:',
      await safeResponseText(claim)
    );
    return new Response('Greška servera.', { status: 500, headers: cors });
  }

  const allowed = await claim.json().catch(() => null);

  if (allowed !== true) {
    return new Response(
      'Potvrdni mejl je već poslat — proveri inbox (i spam) ili pokušaj kasnije.',
      { status: 429, headers: { ...cors, 'Retry-After': '600' } }
    );
  }

  const sent = await sendConfirmationEmail(rows[0], env);

  if (!sent) {
    return new Response(
      'Potvrdni mejl nije uspeo da se pošalje — pokušaj ponovo kasnije.',
      { status: 502, headers: cors }
    );
  }

  return new Response('OK', { status: 200, headers: cors });
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.SITE_URL || 'https://sklopi.rs',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'content-type': 'text/plain; charset=utf-8'
  };
}

function corsPreflightResponse(env) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}

async function sendConfirmationEmail(alert, env) {
  const siteUrl = env.SITE_URL || 'https://sklopi.rs';
  const confirmUrl =
    `${siteUrl.replace(/\/$/, '')}` +
    `/go/confirm-alert?token=${encodeURIComponent(alert.confirmation_token)}`;

  const safeDest = String(alert.dest).replace(/[\r\n]/g, ' ');
  const subject = `Potvrdi svoj price alert za ${safeDest}`;

  const html = `
<div style="
font-family:'Work Sans',Arial,sans-serif;
max-width:520px;
margin:0 auto;
color:#16242A;
line-height:1.6;
">
<h2 style="
font-family:Georgia,serif;
color:#123138;
">
SKLOPI 🔔
</h2>
<p>
Skoro gotovo — potvrdi da si to zaista ti tražio/la
obaveštenje o ceni za
<b>${escapeHtml(alert.dest)}</b>,
ispod
<b style="font-size:18px;color:#8f6423;">${alert.threshold}€</b>.
</p>
<p>
<a
href="${escapeHtml(confirmUrl)}"
style="
display:inline-block;
background:#B8863B;
color:#241505;
padding:12px 20px;
border-radius:4px;
text-decoration:none;
font-weight:600;
"
>
Potvrdi alert →
</a>
</p>
<p style="
color:#4B5D62;
font-size:13px;
">
Ako nisi ti tražio/la ovo, samo ignoriši ovaj mejl —
alert ostaje neaktivan i ne dobijaš ništa dalje.
</p>
</div>
`;

  try {
    const res = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: env.ALERT_FROM_EMAIL || 'SKLOPI <alerti@sklopi.rs>',
          to: alert.email,
          subject,
          html
        })
      }
    );

    if (!res.ok) {
      console.error(
        '[price-alert-worker] Resend (potvrda) slanje nije uspelo:',
        await safeResponseText(res)
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error(
      '[price-alert-worker] Resend (potvrda) network greška:',
      err
    );
    return false;
  }
}

/* ==========================================================
   MAIN CRON
========================================================== */
async function checkAllAlerts(env) {
  const todayKey = new Date().toISOString().slice(0, 10);

  const res = await sbFetch(
    env,
    'price_alerts?status=eq.active&select=*'
  );

  if (!res.ok) {
    console.error(
      '[price-alert-worker] neuspešno čitanje price_alerts:',
      await safeResponseText(res)
    );
    return;
  }

  const alerts = await res.json();

  for (const alert of alerts) {
    try {
      await checkOneAlert(alert, todayKey, env);
    } catch (err) {
      /*
       * Jedan pokvaren alert ne sme da obori proveru svih ostalih.
       */
      console.error(
        '[price-alert-worker] greška za alert',
        alert.id,
        err
      );
    }
  }
}

/* ==========================================================
   CHECK ONE ALERT
========================================================== */
async function checkOneAlert(alert, todayKey, env) {
  const price = computeAlertPrice(alert, todayKey);

  /*
   * VAŽNO: validacija pre BILO KAKVOG poređenja.
   *
   * Ako computeAlertPrice ikad vrati NaN/null/undefined
   * (bug u pricing-core.js, nedostajući podaci za alert...),
   * poređenja tipa `price > threshold` ili `price <= threshold`
   * mogu tiho ispasti false na oba smera (npr. NaN > x je uvek
   * false, a null > x je isto false jer null postaje 0).
   *
   * Bez ove provere, takva loša vrednost bi mogla propasti
   * u "trigger" granu ispod i poslati korisniku mejl tipa
   * "cena je pala na NaN€", pa alert trajno ugasiti.
   *
   * Zato bacamo grešku ovde — checkAllAlerts je hvata i
   * ostavlja alert netaknut (status ostaje 'active'), umesto
   * da nastavimo sa nevalidnim podatkom.
   */
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    throw new Error(
      `computeAlertPrice vratio nevalidnu vrednost za alert ${alert.id}: ${price}`
    );
  }

  const now = new Date().toISOString();

  /*
   * Cena nije pala ispod praga.
   * Samo zapamti poslednju proverenu cenu.
   */
  if (price > Number(alert.threshold)) {
    const updateRes = await sbFetch(
      env,
      `price_alerts?id=eq.${encodeURIComponent(alert.id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          last_price: price,
          last_checked_at: now
        })
      }
    );

    if (!updateRes.ok) {
      throw new Error(
        `Ažuriranje alert-a nije uspelo: ${await safeResponseText(updateRes)}`
      );
    }

    return;
  }

  /*
   * Cena je pala ispod praga.
   *
   * VAŽNO:
   * Alert se NE označava kao "triggered" dok Resend
   * ne potvrdi uspešno slanje emaila.
   */
  const emailSent = await sendAlertEmail(
    alert,
    price,
    env
  );

  if (!emailSent) {
    /*
     * Ostavlja status "active".
     *
     * Sledeći cron će ponovo pokušati slanje.
     */
    console.warn(
      '[price-alert-worker] email nije poslat; alert ostaje active:',
      alert.id
    );
    return;
  }

  /*
   * Email je uspešno prihvaćen od Resend-a.
   * Tek sada gasimo alert.
   */
  const updateRes = await sbFetch(
    env,
    `price_alerts?id=eq.${encodeURIComponent(alert.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'triggered',
        last_price: price,
        last_checked_at: now
      })
    }
  );

  if (!updateRes.ok) {
    /*
     * Ovo je retka, ali važna situacija:
     *
     * email je poslat,
     * ali DB update nije uspeo.
     *
     * Alert će zbog toga potencijalno pokušati ponovo
     * na sledećem cron-u.
     *
     * Bolje je imati mogući duplicate email nego
     * prethodno ponašanje gde se alert ugasi i email
     * uopšte ne bude poslat.
     */
    throw new Error(
      `Email je poslat, ali status alert-a nije ažuriran: ${await safeResponseText(updateRes)}`
    );
  }
}

/* ==========================================================
   SEND EMAIL
========================================================== */
async function sendAlertEmail(alert, price, env) {
  const siteUrl =
    env.SITE_URL || 'https://sklopi.rs';
  const unsubUrl =
    `${siteUrl.replace(/\/$/, '')}` +
    `/go/unsubscribe?token=${encodeURIComponent(alert.unsubscribe_token)}`;

  const tierLabel =
    alert.selection &&
    alert.selection.kind === 'search'
      ? (
          alert.selection.tierLabel ||
          TIER_LABELS[alert.selection.tier] ||
          ''
        )
      : 'tvoj aranžman';

  // dest ide i u subject (van HTML-a), pa uklanjamo novi red
  // kao dodatnu meru opreza protiv header-injection stila problema.
  const safeDest = String(alert.dest).replace(/[\r\n]/g, ' ');
  const subject =
    `Cena za ${safeDest} je pala na ${price}€`;

  const html = `
<div style="
font-family:'Work Sans',Arial,sans-serif;
max-width:520px;
margin:0 auto;
color:#16242A;
line-height:1.6;
">
<h2 style="
font-family:Georgia,serif;
color:#123138;
">
SKLOPI 🔔
</h2>
<p>
Procenjena cena za
<b>${escapeHtml(alert.dest)}</b>
(${escapeHtml(tierLabel)})
je pala na
<b style="
font-size:20px;
color:#8f6423;
">
          ${price}€
</b>
— ispod tvog praga od
        ${alert.threshold}€.
</p>
<p style="
color:#4B5D62;
font-size:13.5px;
">
⚠️ Ovo je i dalje ilustrativna procena,
ne stvarna ponuda partnera — proveri
tačnu cenu i dostupnost pre rezervacije.
</p>
<p>
<a
href="${escapeHtml(siteUrl)}"
style="
display:inline-block;
background:#B8863B;
color:#241505;
padding:12px 20px;
border-radius:4px;
text-decoration:none;
font-weight:600;
"
>
Pogledaj na Skoknici →
</a>
</p>
<hr style="
border:none;
border-top:1px solid #DDD6C6;
margin:28px 0 14px;
">
<p style="
font-size:12px;
color:#4B5D62;
">
Dobio/la si ovaj mejl jer si postavio/la
price alert na Skoknici.
<a
href="${escapeHtml(unsubUrl)}"
style="color:#4B5D62;"
>
Odjavi me sa ovog alerta
</a>.
</p>
</div>
`;

  try {
    const res = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from:
            env.ALERT_FROM_EMAIL ||
            'SKLOPI <alerti@sklopi.rs>',
          to: alert.email,
          subject,
          html
        })
      }
    );

    if (!res.ok) {
      console.error(
        '[price-alert-worker] Resend slanje nije uspelo:',
        await safeResponseText(res)
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error(
      '[price-alert-worker] Resend network greška:',
      err
    );
    return false;
  }
}

/* ==========================================================
   SUPABASE REST HELPER
========================================================== */
function sbFetch(env, path, options = {}) {
  return fetch(
    `${env.SUPABASE_URL}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization:
          `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
        ...(options.headers || {})
      }
    }
  );
}

/* ==========================================================
   HELPERS
========================================================== */
async function safeResponseText(response) {
  try {
    return await response.text();
  } catch {
    return `HTTP ${response.status}`;
  }
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]
  );
}
