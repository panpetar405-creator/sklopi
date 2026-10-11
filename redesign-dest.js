/* Redizajn ekran 3: pregled destinacije na vrhu destinacija.html.
   Cene i fotografija se čitaju iz kartica koje stranica već iscrtava (isti brojevi kao u ponudama). */
(function(){
  'use strict';
  var BEST={atina:'apr–jun, sep–okt',istanbul:'apr–jun, sep–nov',krf:'maj–jun, sep',pariz:'apr–jun, sep–okt',lisabon:'mar–jun, sep–okt',rim:'apr–jun, sep–okt',barselona:'maj–jun, sep–okt'};
  var SEE={
    atina:{a:['Akropola','atina-akropolj-560'],b:['Plaka','atina-plaka-1400'],t:'Atina spaja istoriju, kulturu i moderan život. Idealna je za vikend putovanja, ali i duže odmore.'},
    istanbul:{a:['Plava džamija','istanbul-plava-dzamija-500'],b:['Bosfor i stari grad',''],t:'Grad na dva kontinenta: džamije, bazari i Bosfor na dohvat ruke. Odličan za produženi vikend.'},
    pariz:{a:['Pariz noću','pariz-nocu-500'],b:['Šetnja uz Senu',''],t:'Muzeji, kafei i znamenitosti na maloj površini. Grad koji se najbolje upoznaje peške.'},
    lisabon:{a:['Tramvaj 28','lisabon-tramvaj-560'],b:['Alfama',''],t:'Brežuljkasti grad sa vidikovcima, tramvajima i odličnom hranom, uz blagu klimu većinu godine.'},
    krf:{a:['Krf – uvale','krf-uvala-500'],b:['Stari grad',''],t:'Ostrvo sa mirnim uvalama i venecijanskim starim gradom. Dobro za odmor uz more.'},
    rim:{a:['Koloseum',''],b:['Trevi i stari centar',''],t:'Antički spomenici, trgovi i kuhinja na svakom koraku. Idealan za gradski odmor.'},
    barselona:{a:['Sagrada Família',''],b:['Park Güell i obala',''],t:'Arhitektura, plaže i živa gradska zona na jednom mestu.'}
  };
  function key(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'dj').trim();}
  function num(el){return el?parseInt(String(el.textContent).replace(/[^\d]/g,''),10)||0:0;}
  function minOf(id){
    var t=document.getElementById(id);if(!t)return null;
    var best=null;t.querySelectorAll('.dp-sl-price b').forEach(function(b){var v=num(b);if(v&&(best===null||v<best.v))best={v:v,txt:b.textContent};});
    return best;
  }
  function cur(txt){return /RSD|din/i.test(txt)?'RSD':'€';}
  function fmt(v,c){return 'od '+v.toLocaleString('sr-RS')+' '+c;}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function destName(){
    var h=document.getElementById('dpHeroTitle');if(!h)return '';
    var t=(h.textContent||'').replace(/^[^\p{L}]+/u,'').trim();
    return /kuda putuje/i.test(t)?'':t;
  }
  function adults(){var a=document.getElementById('dpAdults');return Math.max(1,parseInt(a&&a.value,10)||2);}
  function days(){
    var s=document.getElementById('dpStart'),e=document.getElementById('dpEnd');
    if(!s||!e||!s.value||!e.value)return 0;
    var d=Math.round((new Date(e.value)-new Date(s.value))/864e5);return d>0?d+1:0;
  }
  function photo(){
    var im=document.querySelector('#dpHotelTrack .dp-sl-photo img, #dpActTrack .dp-sl-photo img');
    return im?im.getAttribute('src'):'';
  }
  function img(src,fb,alt){
    if(!src)return '';
    var big=src.replace(/-(560|500)\.webp/,'-1400.webp');
    return '<img alt="'+esc(alt||'')+'" src="'+esc(big)+'" onerror="if(this.dataset.f){this.remove()}else{this.dataset.f=1;this.src=\''+esc(fb||src)+'\'}">';
  }
  function build(){
    var name=destName(),main=document.getElementById('main');
    var fl=minOf('dpFlightTrack'),ho=minOf('dpHotelTrack'),ac=minOf('dpActTrack');
    if(!main||!name||!fl||!ho){return;}
    var k=key(name),n=adults(),c=cur(fl.txt),ph=photo(),d=days();
    var total=Math.round(fl.v+ho.v+(ac?ac.v*n:0));
    var see=SEE[k],best=BEST[k];
    var perFl=Math.round(fl.v/n);
    var sig=[name,n,fl.v,ho.v,ac&&ac.v,ph].join('|');
    var root=document.getElementById('ovPage');
    if(root&&root.dataset.sig===sig)return;
    if(!root){root=document.createElement('section');root.id='ovPage';root.className='ov-page';main.insertBefore(root,main.firstChild);}
    root.dataset.sig=sig;
    var seeHtml='';
    if(see){
      var card=function(x){var s=x[1]?'img/'+x[1]+'.webp':ph;return '<a class="ov-see-card" href="#aktivnosti">'+img(s,ph,x[0])+'<span>'+esc(x[0])+'</span></a>';};
      seeHtml='<h3 class="ov-h">Šta videti?</h3><div class="ov-see">'+card(see.a)+card(see.b)+'</div><p class="ov-desc">'+esc(see.t)+'</p>';
    }
    root.innerHTML=
      '<div class="ov-bar"><a class="ov-back" href="index.html" aria-label="Nazad"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 6l-6 6 6 6"/></svg></a><h2>'+esc(name)+'</h2></div>'+
      '<div class="ov-hero'+(ph?'':' ov-nophoto')+'">'+img(ph,ph,name)+'<span class="ov-pill">'+fmt(total,c)+'</span></div>'+
      '<div class="ov-facts">'+(d?'<div>⏱ '+d+' dana</div>':'')+(best?'<div>📅 Najbolji period: '+esc(best)+'</div>':'')+'</div>'+
      '<div class="ov-tiles">'+
        '<a class="ov-tile" href="#avio"><i>✈</i><small>Letovi</small><b>'+fmt(perFl,c)+'</b></a>'+
        '<a class="ov-tile" href="#smestaj"><i>🛏</i><small>Hoteli</small><b>'+fmt(ho.v,c)+'</b></a>'+
        (ac?'<a class="ov-tile" href="#aktivnosti"><i>🎟</i><small>Aktivnosti</small><b>'+fmt(ac.v,c)+'</b></a>':'')+
      '</div>'+
      seeHtml+
      '<button class="ov-cta" type="button" id="ovCta">Pogledaj planove <span aria-hidden="true">→</span></button>'+
      '<p class="ov-note">Cene su okvirne procene za '+n+(n===1?' putnika':' putnika')+' (letovi po osobi, smeštaj ukupno, aktivnosti po osobi).</p>';
    var cta=document.getElementById('ovCta');
    if(cta)cta.onclick=function(){var t=document.getElementById('dpSearch')||document.getElementById('avio');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});};
  }
  var timer;
  function later(){clearTimeout(timer);timer=setTimeout(build,350);}
  document.addEventListener('DOMContentLoaded',function(){
    later();
    var obs=new MutationObserver(later);
    obs.observe(document.getElementById('main')||document.body,{childList:true,subtree:true});
  });
  window.addEventListener('load',later);
})();

/* Ekran 4: letovi — bela lista, sortiranje (Najpovoljniji / Najbrži / Najraniji) */
(function(){
  'use strict';
  var mode='price';
  function val(id){var e=document.getElementById(id);return e?String(e.value||'').trim():'';}
  function dm(iso){var p=String(iso||'').split('-');return p.length===3?p[2]+'.'+p[1]+'.':'';}
  function priceOf(c){var b=c.querySelector('.dp-sl-price b');return b?parseInt(b.textContent.replace(/[^\d]/g,''),10)||0:0;}
  function durOf(c){var s=c.querySelector('.dp-sl-sub'),m=s&&s.textContent.match(/(\d+)\s*h(?:\s*(\d+)\s*min)?/);return m?(+m[1])*60+(+m[2]||0):9999;}
  function timeOf(c){var t=c.querySelector('.dp-sl-title'),m=t&&t.textContent.match(/(\d{1,2}):(\d{2})/);return m?(+m[1])*60+(+m[2]):9999;}
  function split(c){
    var t=c.querySelector('.dp-sl-title');if(!t||t.querySelector('.fl-air'))return;
    var x=t.textContent.split(' · ');if(x.length<2)return;
    t.innerHTML='';
    var a=document.createElement('span');a.className='fl-air';a.textContent=x[0];
    var b=document.createElement('span');b.className='fl-time';b.textContent=x.slice(1).join(' · ');
    t.appendChild(a);t.appendChild(b);
  }
  function sortCards(track){
    var key={price:priceOf,fast:durOf,early:timeOf}[mode];
    var cards=Array.prototype.slice.call(track.children);
    cards.sort(function(a,b){return key(a)-key(b);});
    var cur=Array.prototype.slice.call(track.children);if(cur.every(function(c,i){return c===cards[i];}))return;
    cards.forEach(function(c){track.appendChild(c);});
  }
  function run(){
    var list=document.getElementById('dpFlightList'),track=document.getElementById('dpFlightTrack');
    if(!list||!track||!track.children.length)return;
    Array.prototype.forEach.call(track.children,split);
    var bar=document.getElementById('flBar');
    var n=val('dpAdults')||'2';
    var meta=(dm(val('dpStart'))&&dm(val('dpEnd')))?dm(val('dpStart'))+'–'+dm(val('dpEnd'))+' · ':'';
    var sig=val('dpFrom')+'>'+val('dpTo')+meta+n;
    if(!bar){
      bar=document.createElement('div');bar.id='flBar';bar.className='fl-bar';
      bar.innerHTML='<p class="fl-route"></p><p class="fl-meta"></p><div class="fl-chips">'+
        '<button type="button" class="fl-chip on" data-m="price">Najpovoljniji</button>'+
        '<button type="button" class="fl-chip" data-m="fast">Najbrži</button>'+
        '<button type="button" class="fl-chip" data-m="early">Najraniji</button></div>';
      list.parentNode.insertBefore(bar,list);
      bar.addEventListener('click',function(e){
        var b=e.target.closest('.fl-chip');if(!b)return;
        mode=b.dataset.m;
        bar.querySelectorAll('.fl-chip').forEach(function(x){x.classList.toggle('on',x===b);});
        var t=document.getElementById('dpFlightTrack');if(t)sortCards(t);
      });
    }
    if(bar.dataset.sig!==sig){
      bar.dataset.sig=sig;
      bar.querySelector('.fl-route').textContent=val('dpFrom')+' → '+val('dpTo');
      bar.querySelector('.fl-meta').textContent=meta+n+' '+(n==='1'?'putnik':'putnika');
    }
    bar.querySelectorAll('.fl-chip').forEach(function(x){x.classList.toggle('on',x.dataset.m===mode);});
    sortCards(track);
  }
  var t2;function later(){clearTimeout(t2);t2=setTimeout(run,300);}
  document.addEventListener('DOMContentLoaded',function(){
    later();new MutationObserver(later).observe(document.getElementById('main')||document.body,{childList:true,subtree:true});
  });
  window.addEventListener('load',later);
})();

/* Ekran 5: smeštaj — zaglavlje i sortiranje (Najpovoljniji / Više zvezdica) */
(function(){
  'use strict';
  var mode='price';
  function val(id){var e=document.getElementById(id);return e?String(e.value||'').trim():'';}
  function dm(iso){var p=String(iso||'').split('-');return p.length===3?p[2]+'.'+p[1]+'.':'';}
  function priceOf(c){var b=c.querySelector('.dp-sl-price b');return b?parseInt(b.textContent.replace(/[^\d]/g,''),10)||0:0;}
  function starsOf(c){var t=c.querySelector('.dp-sl-title'),m=t&&t.textContent.match(/(\d)\s*★/);return m?+m[1]:0;}
  function sortCards(track){
    var cards=Array.prototype.slice.call(track.children);
    cards.sort(function(a,b){return mode==='stars'?(starsOf(b)-starsOf(a))||(priceOf(a)-priceOf(b)):priceOf(a)-priceOf(b);});
    var cur=Array.prototype.slice.call(track.children);if(cur.every(function(c,i){return c===cards[i];}))return;
    cards.forEach(function(c){track.appendChild(c);});
  }
  function run(){
    var list=document.getElementById('dpHotelBox'),track=document.getElementById('dpHotelTrack');
    if(!list)list=track&&track.closest('[id$="List"]');
    if(!list||!track||!track.children.length)return;
    var bar=document.getElementById('htBar');
    var n=val('dpAdults')||'2';
    var meta=(dm(val('dpStart'))&&dm(val('dpEnd')))?dm(val('dpStart'))+'–'+dm(val('dpEnd'))+' · ':'';
    var sig=val('dpTo')+meta+n;
    if(!bar){
      bar=document.createElement('div');bar.id='htBar';bar.className='fl-bar';
      bar.innerHTML='<p class="fl-route"></p><p class="fl-meta"></p><div class="fl-chips">'+
        '<button type="button" class="fl-chip on" data-m="price">Najpovoljniji</button>'+
        '<button type="button" class="fl-chip" data-m="stars">Više zvezdica</button></div>';
      list.parentNode.insertBefore(bar,list);
      bar.addEventListener('click',function(e){
        var b=e.target.closest('.fl-chip');if(!b)return;
        mode=b.dataset.m;
        bar.querySelectorAll('.fl-chip').forEach(function(x){x.classList.toggle('on',x===b);});
        var t=document.getElementById('dpHotelTrack');if(t)sortCards(t);
      });
    }
    if(bar.dataset.sig!==sig){
      bar.dataset.sig=sig;
      bar.querySelector('.fl-route').textContent=val('dpTo');
      bar.querySelector('.fl-meta').textContent=meta+n+' '+(n==='1'?'putnik':'putnika');
    }
    bar.querySelectorAll('.fl-chip').forEach(function(x){x.classList.toggle('on',x.dataset.m===mode);});
    sortCards(track);
  }
  var t2;function later(){clearTimeout(t2);t2=setTimeout(run,300);}
  document.addEventListener('DOMContentLoaded',function(){
    later();new MutationObserver(later).observe(document.getElementById('main')||document.body,{childList:true,subtree:true});
  });
  window.addEventListener('load',later);
})();

/* Ekran 6: rent-a-car — zaglavlje i filter menjača (Svi / Manuelni / Automatik) */
(function(){
  'use strict';
  var mode='all';
  function val(id){var e=document.getElementById(id);return e?String(e.value||'').trim():'';}
  function dm(iso){var p=String(iso||'').split('-');return p.length===3?p[2]+'.'+p[1]+'.':'';}
  function apply(track){
    Array.prototype.forEach.call(track.children,function(c){
      var s=(c.querySelector('.dp-sl-sub')||{}).textContent||'';
      var auto=/automat/i.test(s);
      var show=mode==='all'||(mode==='auto'&&auto)||(mode==='manual'&&!auto);
      if(c.hidden!==!show)c.hidden=!show;
      c.style.display=show?'':'none';
    });
  }
  function run(){
    var list=document.getElementById('dpCarBox'),track=document.getElementById('dpCarTrack');
    if(!list||!track||!track.children.length)return;
    var bar=document.getElementById('carBar');
    var n=val('dpAdults')||'2';
    var meta=(dm(val('dpStart'))&&dm(val('dpEnd')))?dm(val('dpStart'))+'–'+dm(val('dpEnd'))+' · ':'';
    var sig=val('dpTo')+meta+n;
    if(!bar){
      bar=document.createElement('div');bar.id='carBar';bar.className='fl-bar';
      bar.innerHTML='<p class="fl-route"></p><p class="fl-meta"></p><div class="fl-chips">'+
        '<button type="button" class="fl-chip on" data-m="all">Svi</button>'+
        '<button type="button" class="fl-chip" data-m="manual">Manuelni</button>'+
        '<button type="button" class="fl-chip" data-m="auto">Automatik</button></div>';
      list.parentNode.insertBefore(bar,list);
      bar.addEventListener('click',function(e){
        var b=e.target.closest('.fl-chip');if(!b)return;
        mode=b.dataset.m;
        bar.querySelectorAll('.fl-chip').forEach(function(x){x.classList.toggle('on',x===b);});
        var t=document.getElementById('dpCarTrack');if(t)apply(t);
      });
    }
    if(bar.dataset.sig!==sig){
      bar.dataset.sig=sig;
      bar.querySelector('.fl-route').textContent='Rent-a-car · '+val('dpTo');
      bar.querySelector('.fl-meta').textContent=meta+n+' '+(n==='1'?'putnik':'putnika');
    }
    apply(track);
  }
  var t2;function later(){clearTimeout(t2);t2=setTimeout(run,300);}
  document.addEventListener('DOMContentLoaded',function(){
    later();new MutationObserver(later).observe(document.getElementById('main')||document.body,{childList:true,subtree:true});
  });
  window.addEventListener('load',later);
})();
