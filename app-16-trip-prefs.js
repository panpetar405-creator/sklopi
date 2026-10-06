/* app-16-trip-prefs.js — ekran #6: "Tip putovanja" (jedan izbor) i "Interesovanja" (više izbora).
   Izbori se čuvaju u window.SKLOPI_TRIP_PREFS i prikazuju kao oznake iznad "Tvoj personalizovani plan".
   Za sada NE menjaju cene ni sastav planova — služe kao preference za sledeći korak (predlozi aktivnosti).
   Hvata klik u capture fazi, pa generički handler za .cp-chip (app-07) ne dira ove grupe. */
(function(){
  'use strict';
  var root = document.getElementById('customPlanner');
  var tags = document.getElementById('ppTags');
  if (!root) return;
  var KEY = 'sklopi_trip_prefs';
  var LABEL = {
    who: { couple:'Parovi', family:'Porodica', friends:'Prijatelji', solo:'Solo' },
    interests: { culture:'Kultura', food:'Gastronomija', beach:'Plaže', nature:'Priroda', nightlife:'Noćni život', shopping:'Šoping' }
  };
  var prefs = { who: '', interests: [] };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object'){
      if (LABEL.who[saved.who]) prefs.who = saved.who;
      if (Array.isArray(saved.interests)) prefs.interests = saved.interests.filter(function(v){ return LABEL.interests[v]; });
    }
  } catch(e){}
  window.SKLOPI_TRIP_PREFS = prefs;

  function tr(s){ try { return typeof tx === 'function' ? tx(s) : s; } catch(e){ return s; } }
  function paint(){
    root.querySelectorAll('.cp-group[data-pref] .cp-chip').forEach(function(c){
      var g = c.closest('.cp-group').dataset.pref;
      var on = g === 'who' ? prefs.who === c.dataset.value : prefs.interests.indexOf(c.dataset.value) >= 0;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function persist(){ try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch(e){} }

  root.addEventListener('click', function(e){
    var chip = e.target.closest('.cp-group[data-pref] .cp-chip');
    if (!chip) return;
    e.stopPropagation();
    var g = chip.closest('.cp-group').dataset.pref, v = chip.dataset.value;
    if (g === 'who') prefs.who = prefs.who === v ? '' : v;
    else {
      var i = prefs.interests.indexOf(v);
      if (i >= 0) prefs.interests.splice(i, 1); else prefs.interests.push(v);
    }
    persist(); paint();
    document.dispatchEvent(new Event('sklopi:cp-refresh'));   // ako su planovi već prikazani, osveži oznake
  }, true);

  /* Oznake: app-07 iznova piše #ppTags pri svakom crtanju, pa ih dopisujemo nazad */
  function addTags(){
    if (!tags || tags.querySelector('[data-pref-tag]')) return;
    var out = [];
    if (prefs.who) out.push(LABEL.who[prefs.who]);
    prefs.interests.forEach(function(v){ out.push(LABEL.interests[v]); });
    out.forEach(function(t){
      var s = document.createElement('span');
      s.className = 'pp-tag pp-tag--pref';
      s.setAttribute('data-pref-tag', '');
      s.textContent = tr(t);
      tags.appendChild(s);
    });
  }
  if (tags) new MutationObserver(addTags).observe(tags, { childList: true });
  paint();
})();
