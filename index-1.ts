// ==========================================================
// unsubscribe-alert
// Javna (bez logina) funkcija — link iz mejla vodi ovde sa
// ?token=<unsubscribe_token>, gasi taj alert (active=false) i
// vraća prostu potvrdnu HTML stranicu.
// Mora biti podešena kao "no verify JWT" funkcija u Supabase-u
// (dashboard → Edge Functions → unsubscribe-alert → Settings,
// ili --no-verify-jwt pri deploy-u), jer korisnik nije ulogovan
// kad klikne link iz mejla.
// ==========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) return html('Nedostaje token za odjavu.', 400);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return html('Greška na serveru.', 500);

  const sb = createClient(supabaseUrl, serviceKey);
  const { data, error } = await sb
    .from('price_alerts')
    .update({ active: false })
    .eq('unsubscribe_token', token)
    .select('id')
    .maybeSingle();

  if (error || !data) return html('Ovaj link za odjavu nije važeći (možda je alert već ugašen).', 404);

  return html('Odjavljen/a si sa ovog alerta za cenu. Više nećeš dobijati mejlove za njega.', 200);
});

function html(msg: string, status: number) {
  return new Response(
    `<!DOCTYPE html><html lang="sr"><meta charset="UTF-8">
     <body style="font-family:sans-serif;max-width:480px;margin:60px auto;text-align:center;color:#16242A;">
       <p>${msg}</p>
       <p><a href="/">← Nazad na Skoknicu</a></p>
     </body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
