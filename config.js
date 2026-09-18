window.SKLOPI_SUPABASE_URL = 'https://qmiyaaepdvmgwesagnar.supabase.co';
window.SKLOPI_SUPABASE_KEY = 'sb_publishable_09taoChvrqBGyieWjp_CRQ_oS4b-Qqt';
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