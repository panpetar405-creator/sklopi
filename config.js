window.SKLOPI_SUPABASE_URL = 'https://qmiyaaepdvmgwesagnar.supabase.co';
window.SKLOPI_SUPABASE_KEY = 'sb_publishable_09taoChvrqBGyieWjp_CRQ_oS4b-Qqt';
// Cloudflare Worker koji šalje potvrdni mejl za price alerts (double
// opt-in) — vidi price-alert-worker.js, ruta /go/send-confirmation.
// PRE PRODUKCIJE: ako Cloudflare Route sklopi.rs/go/* -> Worker JOŠ NIJE
// podešen (vidi PRICE_ALERTS_README.md, korak 5), zameni ovo direktno
// sa *.workers.dev adresom worker-a dok Route ne bude spreman — isto
// poznato ograničenje kao i za unsubUrl u samom workeru.
window.SKLOPI_ALERT_WORKER_URL = 'https://sklopi.rs';
// TODO: zameni pravim GA4 Measurement ID-jem (Admin → Data Streams u GA)
// pre produkcije. Dok je ovo 'G-XXXXXXXXXX', cookies.js NEĆE učitati GA
// (vidi loadGA() tamo) — nema slanja događaja na nepostojeći nalog.
window.SKLOPI_GA_ID = 'G-XXXXXXXXXX';
// ==== AFFILIATE ID-JEVI — JEDINO MESTO GDE SE MENJAJU ====
// Kad partnerski program bude odobren, upiši ID ovde i to je sve: app.js,
// destinacija.html i transport.js čitaju ovo preko affiliate.js.
// Dok stoji 'SKLOPI' (ili prazno), link vodi na partnera ali NE PRATI
// proviziju. Provera: otvori sajt sa ?affcheck u adresi (ili u konzoli
// SKLOPI_AFF.status()). Detaljan status po partneru (šta je potvrđeno,
// šta je pretpostavka, šta nije spremno) je u app.js, odmah iznad
// buildAffiliateLink() — "AFFILIATE DEEP LINKS — STATUS PRE PRODUKCIJE".
window.SKLOPI_AFF_IDS = {
  kayak: 'SKLOPI',        // a= parametar
  booking: 'SKLOPI',      // aid= parametar (hotel i auto)
  viator: 'SKLOPI',       // pid= parametar (pretraga aktivnosti + slajder atrakcija)
  airalo: 'SKLOPI',       // ref= parametar
  worldnomads: 'SKLOPI',  // ref= parametar — ❌ vidi TODO u app.js, program ide preko CJ, ovaj format verovatno ne prati proviziju
  omio: ''                // CEO tracking link iz Travelpayouts panela (https://...), ne samo ID.
                          // Prazno = običan omio.com link bez oznake "partnerski".
                          // Kad upišeš link, dugme dobija oznaku + sponsored, a napomena o proviziji dobija i Omio.
};
