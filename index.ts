// ==========================================================
// check-price-alerts
// Poziva se periodično (vidi pg_cron u migraciji) — za svaki
// aktivni red u price_alerts ponovo računa cenu istim algoritmom
// koji frontend koristi (pricing-core.ts), i ako je cena pala
// ispod threshold-a, šalje mejl preko Resend-a i gasi alert
// (jednokratno obaveštenje, ne spamuje svaki sat).
//
// OBAVEZNI environment secrets (postavi preko `supabase secrets set`
// ili u dashboardu → Edge Functions → Secrets):
//   RESEND_API_KEY   — API ključ na resend.com (ili zameni sendEmail()
//                      pozivom ka drugom provajderu po izboru)
//   ALERT_FROM_EMAIL — npr. "Skoknica <alerti@skoknica.rs>" (mora biti
//                      verifikovan domen kod Resend-a)
//   SITE_URL         — npr. "https://skoknica.rs" (za link ka odjavi)
// SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY su automatski dostupni
// svakoj Edge Function-u, ne treba ih ručno podešavati.
// ==========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { computeSearchTierTotal, computeBuilderTotal, nightsBetween, todayStr } from '../_shared/pricing-core.ts';

const BATCH_SIZE = 200; // koliko alerta se proverava po pozivu — poveći ako ih ima mnogo

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('ALERT_FROM_EMAIL');
  const siteUrl = Deno.env.get('SITE_URL') || '';

  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY nisu podešeni' }, 500);
  }
  const sb = createClient(supabaseUrl, serviceKey);

  const { data: alerts, error } = await sb
    .from('price_alerts')
    .select('id, email, dest, date_from, date_to, adults, selection, threshold, unsubscribe_token')
    .eq('active', true)
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (error) return json({ error: error.message }, 500);

  const day = todayStr();
  let checked = 0, triggered = 0, failed = 0;

  for (const alert of alerts || []) {
    checked++;
    try {
      const nights = nightsBetween(alert.date_from, alert.date_to);
      const sel = alert.selection || {};
      const total = sel.kind === 'builder'
        ? computeBuilderTotal(sel, alert.dest, nights, nights, alert.adults, day)
        : computeSearchTierTotal(alert.dest, nights, nights, alert.adults, sel.tier || 'best', sel.flags, day);

      await sb.from('price_alerts')
        .update({ last_checked_at: new Date().toISOString(), last_price: total })
        .eq('id', alert.id);

      if (total <= alert.threshold) {
        if (resendKey && fromEmail) {
          await sendEmail(resendKey, fromEmail, alert, total, siteUrl);
        }
        await sb.from('price_alerts')
          .update({ active: false, triggered_at: new Date().toISOString() })
          .eq('id', alert.id);
        triggered++;
      }
    } catch (e) {
      failed++;
      console.error('[check-price-alerts] greška za alert', alert.id, e);
    }
  }

  return json({ checked, triggered, failed });
});

async function sendEmail(
  apiKey: string, from: string,
  alert: { email: string; dest: string; unsubscribe_token: string },
  total: number, siteUrl: string
) {
  const unsubLink = siteUrl
    ? `${siteUrl}/api/unsubscribe-alert?token=${alert.unsubscribe_token}`
    : '#';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: alert.email,
      subject: `Cena za ${alert.dest} je pala — €${total}`,
      html: `
        <p>Zdravo,</p>
        <p>Procenjena cena za <strong>${escapeHtml(alert.dest)}</strong> je pala na
           <strong>€${total}</strong>, ispod praga koji si postavio/la.</p>
        <p><em>⚠️ I dalje ilustrativna procena, ne stvarna ponuda partnera —
           proveri tačnu cenu direktno na partnerskom sajtu pre rezervacije.</em></p>
        <p><a href="${unsubLink}">Odjavi se od ovog alerta</a></p>
      `
    })
  });
  if (!res.ok) throw new Error('Resend HTTP ' + res.status + ': ' + (await res.text()));
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
