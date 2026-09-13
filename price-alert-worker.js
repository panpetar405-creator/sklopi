/* ==========================================================
   SKOKNICA — Price Alert Worker

   Radi dve stvari:
   1) Cron proverava aktivne price_alerts i šalje email
      kada procenjena cena padne ispod praga.
   2) /unsubscribe?token=... gasi alert.

   ENV / SECRETS:
     SUPABASE_URL
     SUPABASE_SERVICE_ROLE_KEY
     RESEND_API_KEY
     ALERT_FROM_EMAIL
     SITE_URL
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

    return new Response('Skoknica price-alert worker.', {
      status: 200
    });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkAllAlerts(env));
  }
};


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

  const res = await sbFetch(
    env,
    `price_alerts?unsubscribe_token=eq.${encodeURIComponent(token)}`,
    {
      method: 'PATCH',
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
      'Alert nije pronađen ili je došlo do greške.',
      { status: 404 }
    );
  }

  return new Response(
    `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Skoknica — Alert ugašen</title>
</head>
<body style="font-family:sans-serif;max-width:480px;margin:60px auto;text-align:center;color:#16242A;padding:20px;">
  <h2>Alert je ugašen.</h2>
  <p>
    Više nećeš dobijati obaveštenja za ovu pretragu.
    Možeš napraviti novi alert bilo kada na Skoknici.
  </p>
  <a
    href="${escapeHtml(env.SITE_URL || 'https://skoknica.rs')}"
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
    env.SITE_URL || 'https://skoknica.rs';

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

  const subject =
    `Cena za ${alert.dest} je pala na ${price}€`;

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
        Skoknica 🔔
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
          ${escapeHtml(price)}€
        </b>
        — ispod tvog praga od
        ${escapeHtml(alert.threshold)}€.
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
            'Skoknica <alerti@skoknica.rs>',
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