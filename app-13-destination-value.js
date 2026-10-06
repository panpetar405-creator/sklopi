/* SKLOPI UX v5 — destination-first value layer.
   Sekcija "O destinaciji" je vidljiva tek kad su otvoreni planovi ili detalj plana,
   tekstovi prate jezik sajta (sr/en/de/ru). */
(function(){
  'use strict';
  var $ = function(id){ return document.getElementById(id); };
  var section = $('destInfoSection');
  if(!section) return;

  var L = {
    sr:{kicker:'SKLOPI INTELIGENCE',title:'Pre nego što rezervišeš — znaj gde ideš.',sub:'Praktične informacije za ovu destinaciju, prilagođene tvom polasku i pasošu.',
        note:'Informacije generiše AI radi orijentacije. Vize i uslove ulaska proveri na zvaničnim sajtovima.',
        nav:'Brzi pregled destinacije',budget:'Troškovi',entry:'Ulazak',climate:'Klima',transport:'Prevoz',see:'Šta videti',about:'O destinaciji — '},
    en:{kicker:'SKLOPI INTELLIGENCE',title:'Know where you are going before you book.',sub:'Practical info for this destination, based on your departure and passport.',
        note:'This information is AI-generated as a guide. Check visa and entry rules on official websites.',
        nav:'Destination quick view',budget:'Costs',entry:'Entry',climate:'Climate',transport:'Transport',see:'Must-see',about:'About '},
    de:{kicker:'SKLOPI INTELLIGENCE',title:'Wissen, wohin es geht, bevor du buchst.',sub:'Praktische Infos zu diesem Ziel, passend zu Abflugort und Reisepass.',
        note:'Diese Infos sind KI-generiert und dienen der Orientierung. Visa und Einreise bitte auf offiziellen Seiten prüfen.',
        nav:'Schnellübersicht',budget:'Kosten',entry:'Einreise',climate:'Klima',transport:'Verkehr',see:'Sehenswert',about:'Über '},
    ru:{kicker:'SKLOPI INTELLIGENCE',title:'Узнай, куда едешь, до бронирования.',sub:'Практическая информация о направлении с учётом вылета и паспорта.',
        note:'Информация создана ИИ для ориентира. Визы и въезд проверяйте на официальных сайтах.',
        nav:'Краткий обзор',budget:'Расходы',entry:'Въезд',climate:'Климат',transport:'Транспорт',see:'Что посмотреть',about:'О направлении — '}
  };
  var NEEDLES = {
    budget:['troš','cost','kosten','расход','бюджет','budget'],
    entry:['viz','visa','pasoš','passport','einreise','reisepass','виз','паспорт','въезд','ulaz'],
    climate:['klim','climate','klima','климат'],
    transport:['prevoz','transport','verkehr','транспорт'],
    see:['obavezno','must-see','must see','sehenswert','посмотреть','достопримеч']
  };
  function lang(){
    var l=(document.documentElement.lang||'sr').slice(0,2).toLowerCase();
    return L[l]?l:'sr';
  }
  function tx(){ return L[lang()]; }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  function addValueHeader(){
    var head = section.querySelector('.destination-value-head');
    var T = tx();
    var html =
      '<div class="destination-value-kicker">'+esc(T.kicker)+'</div>' +
      '<div class="destination-value-copy">' +
        '<h2 class="destination-value-title">'+esc(T.title)+'</h2>' +
        '<p class="destination-value-sub">'+esc(T.sub)+'</p>' +
        '<p class="destination-value-note">'+esc(T.note)+'</p>' +
      '</div>';
    if(head){ head.innerHTML = html; return; }
    head = document.createElement('div');
    head.className = 'destination-value-head';
    head.innerHTML = html;
    var ad = section.querySelector('.ad-head');
    if(ad) ad.before(head); else section.prepend(head);
  }

  function addQuickLinks(){
    var T = tx();
    var nav = section.querySelector('.destination-value-nav');
    var keys = ['budget','entry','climate','transport','see'];
    var icons = {budget:'💶',entry:'🛂',climate:'☀️',transport:'🚇',see:'📍'};
    var html = keys.map(function(k){
      return '<button type="button" data-di-jump="'+k+'">'+icons[k]+' '+esc(T[k])+'</button>';
    }).join('');
    if(nav){ nav.innerHTML = html; nav.setAttribute('aria-label', T.nav); return; }
    nav = document.createElement('div');
    nav.className = 'destination-value-nav';
    nav.setAttribute('aria-label', T.nav);
    nav.innerHTML = html;
    var content = $('destInfoContent');
    if(content) content.before(nav);
    nav.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-di-jump]');
      if(!btn) return;
      var needles = NEEDLES[btn.getAttribute('data-di-jump')] || [];
      var hit = [].slice.call(section.querySelectorAll('.di-card')).find(function(card){
        var s = (card.innerText||'').toLowerCase();
        return needles.some(function(n){ return s.indexOf(n) >= 0; });
      });
      if(hit) hit.scrollIntoView({behavior:'smooth', block:'center'});
    });
  }

  function syncVisibility(){
    var plans = $('destinationPlans'), detail = $('planDetail');
    var open = (plans && !plans.hidden) || (detail && !detail.hidden);
    section.hidden = !open;
  }

  function refresh(){
    addValueHeader();
    addQuickLinks();
    var title = $('destInfoTitle'), dest = $('dest');
    if(title && dest && dest.value.trim()) title.textContent = tx().about + dest.value.trim();
    syncVisibility();
  }

  refresh();
  var mo = new MutationObserver(syncVisibility);
  ['destinationPlans','planDetail'].forEach(function(id){
    var el = $(id); if(el) mo.observe(el, {attributes:true, attributeFilter:['hidden']});
  });
  document.addEventListener('sklopi:plan-breakdown', refresh);
  document.addEventListener('sklopi:plan-changed', refresh);
  if($('dest')) $('dest').addEventListener('change', function(){ setTimeout(refresh, 350); });
})();
