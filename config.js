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
// TODO PRE PRODUKCIJE: zameni SVAKI 'SKLOPI' pravim affiliate/tracking
// ID-jem tog partnera, tek kad partnerski program bude odobren. Dok god
// ovde stoji 'SKLOPI', link vodi na partnera ali NE PRATI proviziju.
// Detaljan status po partneru (šta je potvrđeno, šta je pretpostavka,
// šta uopšte nije spremno za produkciju) je u app.js, odmah iznad
// buildAffiliateLink() — "AFFILIATE DEEP LINKS — STATUS PRE PRODUKCIJE".
window.SKLOPI_AFF_IDS = {
  kayak: 'SKLOPI',        // ref= parametar
  booking: 'SKLOPI',      // aid= parametar (hotel i auto)
  viator: 'SKLOPI',       // pid= parametar
  airalo: 'SKLOPI',       // ref= parametar
  worldnomads: 'SKLOPI'   // ref= parametar — ❌ vidi TODO u app.js, link možda uopšte ne ide u produkciju
};