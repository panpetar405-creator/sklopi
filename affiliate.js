/* ==========================================================
   SKLOPI — affiliate ID-jevi, jedno mesto za čitanje.

   ID-jeve UPISUJEŠ samo u config.js (window.SKLOPI_AFF_IDS).
   Ovaj fajl je jedini koji taj objekat čita; app.js, destinacija.html
   i transport.js pitaju ovde. Zato kad odobrenje stigne, menja se
   samo config.js — ništa drugo.

   Vrednost 'SKLOPI' (ili prazno) = partner još NIJE odobren: link i
   dalje vodi na partnera, ali NE PRATI proviziju.

   Provera posle upisa ID-jeva: otvori sajt sa ?affcheck u adresi
   (ili SKLOPI_AFF.status() u konzoli) — ispiše koji su partneri
   živi, a koji još čekaju.

   Omio je izuzetak: ne uzima samo ID nego CEO tracking link iz
   Travelpayouts panela (https://...), vidi config.js.
========================================================== */
(function(){
  'use strict';
  var PLACEHOLDER = 'SKLOPI';
  var PROVIDERS = ['kayak', 'booking', 'viator', 'airalo', 'worldnomads', 'omio'];

  function raw(provider){
    var ids = window.SKLOPI_AFF_IDS || {};
    var v = ids[provider];
    return (typeof v === 'string') ? v.trim() : '';
  }
  // true samo kad je u config.js upisana prava vrednost (ne prazno, ne 'SKLOPI')
  function isLive(provider){
    var v = raw(provider);
    return !!v && v.toUpperCase() !== PLACEHOLDER;
  }
  // ID za URL parametar; dok partner nije odobren vraća 'SKLOPI'
  function id(provider){
    return isLive(provider) ? raw(provider) : PLACEHOLDER;
  }
  // Partneri koji dobijaju ceo link (Omio): pravi https link ili fallback
  function url(provider, fallback){
    return (isLive(provider) && /^https:\/\//i.test(raw(provider))) ? raw(provider) : fallback;
  }
  function status(){
    var out = {};
    PROVIDERS.forEach(function(p){ out[p] = isLive(p) ? 'LIVE' : 'čeka odobrenje (placeholder)'; });
    return out;
  }

  window.SKLOPI_AFF = { PLACEHOLDER: PLACEHOLDER, PROVIDERS: PROVIDERS, id: id, isLive: isLive, url: url, status: status };

  // Automatski ispis samo lokalno (localhost / file://) ili uz ?affcheck
  try {
    var host = location.hostname;
    var local = !host || host === 'localhost' || host === '127.0.0.1';
    if ((local || /[?&]affcheck\b/.test(location.search)) && window.console && console.table){
      console.info('[SKLOPI] affiliate status (config.js → SKLOPI_AFF_IDS):');
      console.table(status());
    }
  } catch (e) { /* nebitno */ }
})();
