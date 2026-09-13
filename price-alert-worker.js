/* ==========================================================
   SKOKNICA вЂ” Price Alert Worker
   Cloudflare Worker koji:
     1) na cron raspored (podeЕЎeno u wrangler.toml) prolazi kroz sve
        price_alerts sa status='active', ponovo raДЌuna procenjenu cenu
        (pricing-core.js) i ЕЎalje mejl kad cena padne ispod praga;
     2) izlaЕѕe /unsubscribe?token=... rutu za "Odjavi me" link u mejlu
        (jer klijent iz browsera nema update pravo na price_alerts вЂ” vidi
        supabase/price_alerts.sql).

   ENV / SECRETS potrebni (postavi preko `wrangler secret put <ime>`):
     SUPABASE_URL              вЂ” isto ЕЎto i window.SKOKNICA_SUPABASE_URL
     SUPABASE_SERVICE_ROLE_KEY вЂ” service_role kljuДЌ (NIKAD anon/public!
                                  ovaj kljuДЌ zaobilazi RLS, ДЌuvaj ga
                                  samo kao Worker secret, nikad u
                                  frontend kodu)
     RESEND_API_KEY            вЂ” API kljuДЌ za slanje mejlova (resend.com)
     ALERT_FROM_EMAIL          вЂ” npr. "Skoknica <alerti@skoknica.rs>"
                                  (mora biti verifikovan domen kod Resend-a)
     SITE_URL                  вЂ” npr. "https://skoknica.rs" (za linkove u mejlu)
========================================================== */

import { computeAlertPrice } from './pricing-core.js';

const TIER_LABELS = { budget: 'Budget', best: 'Best Value', comfort: 'Comfort' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Prihvata OBA oblika putanje:
    //  - /go/unsubscribe  вЂ” kad je podeЕЎen Cloudflare Route sa skoknica.rs
    //    (Route prosleД‘uje PUNU putanju Worker-u, ne skida "/go" prefiks;
    //    ovo mora da se poklapa sa unsubUrl koji gradi sendAlertEmail()).
    //  - /unsubscribe     вЂ” kad se link u mejlu direktno gradi na
    //    *.workers.dev adresi (fallback opisan u komentaru iznad unsubUrl).
    if ((url.pathname === '/go/unsubscribe' || url.pathname === '/unsubscribe') && request.method === 'GET') {
      return handleUnsubscribe(url, env);
    }

    return new Response('Skoknica price-alert worker.', { status: 200 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkAllAlerts(env));
  },
};

async function handleUnsubscribe(url, env) {
  const token = url.searchParams.get('token');
  if (!token) return new Response('Nedostaje token.', { status: 400 });

  const res = await sbFetch(env, `price_alerts?unsubscribe_token=eq.${encodeURIComponent(token)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'cancelled' }),
  });

  if (!res.ok) return new Response('Alert nije pronaД‘en ili je veД‡ ugaЕЎen.', { status: 404 });

  return new Response(
    `<!DOCTYPE html><html lang="sr"><meta charset="UTF-8">
     <body style="font-family:sans-serif;max-width:480px;margin:60px auto;text-align:center;color:#16242A;">
       <h2>Alert je ugaЕЎen.</h2>
       <p>ViЕЎe neД‡eЕЎ dobijati obaveЕЎtenja za ovu pretragu. MoЕѕeЕЎ napraviti nov alert bilo kad na Skoknici.</p>
       <a href="${env.SITE_URL || 'https://skoknica.rs'}" style="color:#8f6423;">в†ђ Nazad na Skoknicu</a>
     </body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

async function checkAllAlerts(env) {
  const todayKey = new Date().toISOString().slice(0, 10);

  const res = await sbFetch(env, 'price_alerts?status=eq.active&select=*');
  if (!res.ok) {
    console.error('[price-alert-worker] neuspeЕЎno ДЌitanje price_alerts:', await res.text());
    return;
  }
  const alerts = await res.json();

  for (const alert of alerts) {
    try {
      await checkOneAlert(alert, todayKey, env);
    } catch (err) {
      // Jedan pokvaren red ne sme da obori proveru svih ostalih alertova.
      console.error('[price-alert-worker] greЕЎka za alert', alert.id, err);
    }
  }
}

async function checkOneAlert(alert, todayKey, env) {
  const price = computeAlertPrice(alert, todayKey);

  if (price <= Number(alert.threshold)) {
    await sendAlertEmail(alert, price, env);
    await sbFetch(env, `price_alerts?id=eq.${alert.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'triggered',
        last_price: price,
        last_checked_at: new Date().toISOString(),
      }),
    });
    return;
  }

  // Nije okinulo вЂ” samo aЕѕuriraj poslednju viД‘enu cenu za istoriju/debug.
  await sbFetch(env, `price_alerts?id=eq.${alert.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      last_price: price,
      last_checked_at: new Date().toISOString(),
    }),
  });
}

async function sendAlertEmail(alert, price, env) {
  const siteUrl = env.SITE_URL || 'https://skoknica.rs';
  const unsubUrl = `${siteUrl.replace(/\/$/, '')}/go/unsubscribe?token=${alert.unsubscribe_token}`;
  // ^ ako Worker nije na istom domenu kao sajt, zameni ovo direktnom Worker
  //   URL adresom (npr. https://skoknica-alerts.<subdomain>.workers.dev/unsubscribe?token=...)
  //   ili podesi rutu na skoknica.rs/go/unsubscribe da prosleД‘uje na Worker (Cloudflare "Route").

  const tierLabel = alert.selection && alert.selection.kind === 'search'
    ? (alert.selection.tierLabel || TIER_LABELS[alert.selection.tier] || '')
    : 'tvoj aranЕѕman';

  const subject = `Cena za ${alert.dest} je pala na ${price}в‚¬`;
  const html = `
    <div style="font-family:'Work Sans',Arial,sans-serif;max-width:520px;margin:0 auto;color:#16242A;line-height:1.6;">
      <h2 style="font-family:Georgia,serif;color:#123138;">Skoknica рџ””</h2>
      <p>Procenjena cena za <b>${escapeHtml(alert.dest)}</b> (${tierLabel}) je pala na
        <b style="font-size:20px;color:#8f6423;">${price}в‚¬</b> вЂ” ispod tvog praga od ${alert.threshold}в‚¬.</p>
      <p style="color:#4B5D62;font-size:13.5px;">
        вљ пёЏ Ovo je i dalje ilustrativna procena, ne stvarna ponuda partnera вЂ” proveri taДЌnu cenu
        i dostupnost pre rezervacije.
      </p>
      <p><a href="${siteUrl}" style="display:inline-block;background:#B8863B;color:#241505;
        padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:600;">
        Pogledaj na Skoknici в†’</a></p>
      <hr style="border:none;border-top:1px solid #DDD6C6;margin:28px 0 14px;">
      <p style="font-size:12px;color:#4B5D62;">
        Dobio/la si ovaj mejl jer si postavio/la price alert na Skoknici.
        <a href="${unsubUrl}" style="color:#4B5D62;">Odjavi me sa ovog alerta</a>.
      </p>
    </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.ALERT_FROM_EMAIL || 'Skoknica <alerti@skoknica.rs>',
      to: alert.email,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error('[price-alert-worker] slanje mejla nije uspelo:', await res.text());
  }
}

/* Mala helper funkcija za Supabase REST (PostgREST) pozive sa service_role kljuДЌem. */
function sbFetch(env, path, options = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...(options.headers || {}),
    },
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}