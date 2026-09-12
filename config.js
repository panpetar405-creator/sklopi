// Konfiguracija — promeni URL kad testiraš pravi backend (lokalno ili deployovan).
// Prazan string '' = sajt radi samostalno, na ugrađenom mock generatoru,
// bez potrebe za bilo kakvim serverom (dobro za testiranje na telefonu).
window.SKOKNICA_API_BASE = 'https://skoknica-api.panpetar405.workers.dev';

// SUPABASE — backend za "Moja putovanja" (zamena za localStorage mock).
// Publishable key je bezbedan za browser jer je RLS uključen na trips tabeli.
window.SKOKNICA_SUPABASE_URL = 'https://qmiyaaepdvmgwesagnar.supabase.co';
window.SKOKNICA_SUPABASE_KEY = 'sb_publishable_09taoChvrqBGyieWjp_CRQ_oS4b-Qqt';
