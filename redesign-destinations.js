/* Ekran „Destinacije“ — otvara se iz donje navigacije. Podaci dolaze iz iste liste kao „Gde bi sledeće?“
   (POPULAR_FILTER_POOL / popularCardData u app-08), pa su cene i tagovi uvek usklađeni. */
(function(){
  'use strict';
  var SEASON={atina:'apr–jun, sep–okt',istanbul:'apr–jun, sep–nov',krf:'maj–jun, sep',pariz:'apr–jun, sep–okt',lisabon:'mar–jun, sep–okt',rim:'apr–jun, sep–okt',barselona:'maj–jun, sep',budva:'jun–sep',bec:'apr–okt',solun:'maj–okt',budimpesta:'apr–okt',prag:'apr–okt',zagreb:'apr–okt',dubrovnik:'maj–okt',split:'jun–sep'};
  var LOCAL={atina:'atina-akropolj',istanbul:'istanbul-plava-dzamija',krf:'krf-uvala',pariz:'pariz-nocu',lisabon:'lisabon-tramvaj',bec:'bec-schonbrunn',solun:'solun-ano-poli',budva:'budva-stari-grad',split:'split-riva',zagreb:'zagreb-gornji-grad',bled:'bled-jezero',dubrovnik:'dubrovnik-stari-grad',ohrid:'ohrid-sveti-jovan-kaneo',ljubljana:'ljubljana-tromostovlje',prag:'prag-karlov-most',budimpesta:'budimpesta-lancani-most-noc',santorini:'santorini-oija-kupole',barselona:'barselona-park-gvelj',kotor:'kotor-zaliv','plitvicka jezera':'plitvice-jezero'};
  var CHIPS=[['all','Sve'],['weekend','Vikend'],['sea','More'],['city','Grad'],['nature','Priroda'],['europe','Evropa']];
  var SORTS=[['pop','Popularno'],['price','Cena'],['near','Najbliže']];
  var SAVE_KEY='sklopi_saved_dests';
  var st={f:'all',s:'pop',q:''},items=null,root=null,nav=null,saved=[];

  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function nk(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'dj').trim();}
  function loadSaved(){try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'[]')||[];}catch(e){saved=[];}}
  function storeSaved(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(saved));}catch(e){}}
  function minutes(meta){var m=String(meta).match(/(?:(\d+)h)?\s*(?:(\d+)m)?\s*$/);var h=m&&m[1]?+m[1]:0,mi=m&&m[2]?+m[2]:0;return (h||mi)?h*60+mi:9999;}
  function priceNum(p){var n=parseInt(String(p).replace(/[^\d]/g,''),10);return n||999999;}

  function build(){
    if(items)return items;
    items=[];
    var pool;
    try{pool=POPULAR_FILTER_POOL;}catch(e){pool=[];}
    var seen={};
    pool.forEach(function(c,i){
      var d;try{d=popularCardData(c);}catch(e){return;}
      var key=nk(d.dest);if(!d.dest||seen[key])return;seen[key]=1;
      var img=d.image;
      if(LOCAL[key])img='img/'+LOCAL[key]+'-560.webp';
      items.push({key:key,dest:d.dest,name:d.name,country:String(d.meta||'').split(' · ')[0],flight:(String(d.meta||'').split(' · ')[1]||''),price:d.price,tags:String(d.category||'').split(/\s+/).filter(Boolean),img:img,idx:i,min:minutes(String(d.meta||'').split(' · ')[1]||''),pn:priceNum(d.price),season:SEASON[key]||''});
    });
    return items;
  }

  function create(){
    root=document.createElement('div');
    root.className='dx-screen';root.id='destBrowse';root.hidden=true;
    root.setAttribute('role','dialog');root.setAttribute('aria-label','Destinacije');
    root.innerHTML='<div class="dx-wrap">'
      +'<div class="dx-head"><h1 class="dx-title">Destinacije</h1>'
      +'<label class="dx-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.8"></circle><path d="M16.2 16.2L21 21"></path></svg>'
      +'<input id="dxSearch" type="search" placeholder="Pretraži destinaciju..." aria-label="Pretraži destinaciju" autocomplete="off"><button type="button" class="dx-clear" id="dxClear" aria-label="Obriši" hidden>✕</button></label>'
      +'<div class="dx-chips" role="tablist" aria-label="Kategorije">'+CHIPS.map(function(c){return '<button type="button" class="dx-chip'+(c[0]==='all'?' is-active':'')+'" data-f="'+c[0]+'">'+c[1]+'</button>';}).join('')+'</div></div>'
      +'<div class="dx-bar"><span class="dx-count" id="dxCount"></span><div class="dx-sort" role="group" aria-label="Sortiranje">'+SORTS.map(function(s){return '<button type="button" data-s="'+s[0]+'"'+(s[0]==='pop'?' class="is-active"':'')+'>'+s[1]+'</button>';}).join('')+'</div></div>'
      +'<div id="dxList"></div>'
      +'<button type="button" class="dx-cta" id="dxFind">Pronađi mi destinaciju<span aria-hidden="true">→</span></button></div>';
    document.body.appendChild(root);

    var inp=root.querySelector('#dxSearch'),clr=root.querySelector('#dxClear');
    inp.addEventListener('input',function(){st.q=inp.value;clr.hidden=!inp.value;render();});
    clr.addEventListener('click',function(){inp.value='';st.q='';clr.hidden=true;render();inp.focus();});
    root.querySelector('.dx-chips').addEventListener('click',function(e){var b=e.target.closest('.dx-chip');if(!b)return;st.f=b.dataset.f;root.querySelectorAll('.dx-chip').forEach(function(x){x.classList.toggle('is-active',x===b);});render();});
    root.querySelector('.dx-sort').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;st.s=b.dataset.s;root.querySelectorAll('.dx-sort button').forEach(function(x){x.classList.toggle('is-active',x===b);});render();});
    root.querySelector('#dxFind').addEventListener('click',function(){close(true);var m=document.getElementById('matchTriggerBtn');if(m)setTimeout(function(){m.click();},60);});
    root.querySelector('#dxList').addEventListener('click',function(e){
      var h=e.target.closest('.dx-heart');
      if(h){e.stopPropagation();var k=h.dataset.k,i=saved.indexOf(k);if(i>-1)saved.splice(i,1);else saved.push(k);storeSaved();h.classList.toggle('is-on',i===-1);h.setAttribute('aria-pressed',i===-1);return;}
      var c=e.target.closest('.dx-card');if(c)openDest(c.dataset.dest);
    });
    root.addEventListener('scroll',function(){root.classList.toggle('is-scrolled',root.scrollTop>4);},{passive:true});
  }

  function openDest(dest){
    var el=document.getElementById('dest');if(el)el.value=dest;
    try{trackFunnelEvent('search_submit',{destination:dest});}catch(e){}
    try{bumpSearchStat(dest);}catch(e){}
    if(window.SKLOPI_showDestPlans)window.SKLOPI_showDestPlans();
  }

  function filtered(){
    var q=nk(st.q);
    var a=build().filter(function(x){
      if(st.f!=='all'&&x.tags.indexOf(st.f)<0)return false;
      if(q&&nk(x.name).indexOf(q)<0&&nk(x.country).indexOf(q)<0&&nk(x.dest).indexOf(q)<0)return false;
      return true;
    });
    if(st.s==='price')a.sort(function(x,y){return x.pn-y.pn||x.idx-y.idx;});
    else if(st.s==='near')a.sort(function(x,y){return x.min-y.min||x.idx-y.idx;});
    return a;
  }

  function card(x){
    var thumb=x.img?'<span class="dx-thumb"><img src="'+esc(x.img)+'" alt="'+esc(x.name)+'" loading="lazy"></span>':'<span class="dx-thumb" data-fb="'+esc(x.dest)+'"></span>';
    return '<div class="dx-card" role="button" tabindex="0" data-dest="'+esc(x.dest)+'">'+thumb
      +(x.price?'<span class="dx-price">'+esc(x.price)+'</span>':'')
      +'<button type="button" class="dx-heart'+(saved.indexOf(x.key)>-1?' is-on':'')+'" data-k="'+x.key+'" aria-label="Sačuvaj '+esc(x.name)+'" aria-pressed="'+(saved.indexOf(x.key)>-1)+'"><i><svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.2-9.3A5 5 0 0 1 12 6.6a5 5 0 0 1 9.2 4.6c-1.7 4.7-9.2 9.3-9.2 9.3Z"/></svg></i></button>'
      +'<span class="dx-copy"><span class="dx-name">'+esc(x.name)+'</span><span class="dx-meta">'+esc(x.country+(x.flight?' · '+x.flight:''))+'</span>'
      +(x.season?'<span class="dx-season">Sezona: '+esc(x.season)+'</span>':'')+'</span></div>';
  }

  function grid(a){return '<div class="dx-grid">'+a.map(card).join('')+'</div>';}

  /* ---- automatske fotografije: bez ručnog unosa po gradu ----
     Redosled: 1) tvoja lokalna slika (LOCAL, opciono), 2) keš u pregledaču (30 dana, promašaj 1 dan),
     3) Worker /go/dest-image (Wikidata/Wikipedia, keširan na serveru), 4) Wikipedia direktno (fetchWikiImage iz app-11).
     Traži se tek kad kartica uđe u vidno polje (+300px), da se ne šalje 30 zahteva odjednom. */
  var IMG_KEY='sklopi_dx_img_v1',IMG_HIT=30*864e5,IMG_MISS=864e5,imgCache=null,imgBusy={},io=null;
  function imgStore(){if(imgCache)return imgCache;try{imgCache=JSON.parse(localStorage.getItem(IMG_KEY)||'{}')||{};}catch(e){imgCache={};}return imgCache;}
  function imgSave(){try{localStorage.setItem(IMG_KEY,JSON.stringify(imgCache));}catch(e){}}
  function imgCached(d){var e=imgStore()[d];if(!e||!(Date.now()-e[1]<(e[0]?IMG_HIT:IMG_MISS)))return null;return e;}
  function imgEndpoint(d){var b=window.SKLOPI_DEST_IMG_BASE||window.SKLOPI_ALERT_WORKER_URL||'';return String(b).replace(/\/$/,'')+'/go/dest-image?city='+encodeURIComponent(d);}
  function imgLookup(d){
    if(imgBusy[d])return imgBusy[d];
    imgBusy[d]=fetch(imgEndpoint(d),{headers:{Accept:'application/json'}})
      .then(function(r){return r.ok?r.json():null;})
      .then(function(j){return j&&j.url?String(j.url):'';})
      .catch(function(){return '';})
      .then(function(u){
        if(u)return u;
        try{if(typeof fetchWikiImage==='function'&&typeof destWikiTitle==='function')return Promise.resolve(fetchWikiImage(destWikiTitle({dest:d}))).then(function(x){return x||'';},function(){return '';});}catch(e){}
        return '';
      })
      .then(function(u){imgStore()[d]=[u,Date.now()];imgSave();delete imgBusy[d];return u;});
    return imgBusy[d];
  }
  function putPhoto(t,d,url){
    if(!url||!t.isConnected)return;
    var im=new Image();
    im.onload=function(){if(!t.isConnected)return;t.classList.remove('thumb-fallback');t.removeAttribute('data-fb');t.innerHTML='';im.alt=d;t.appendChild(im);};
    im.src=url;   /* ako se ne učita, kartica ostaje sa slovom */
  }
  function autoPhotos(list){
    if(io){io.disconnect();io=null;}
    var todo=[];
    list.querySelectorAll('.dx-thumb').forEach(function(t){
      if(t.querySelector('img'))return;
      var c=t.closest('.dx-card'),d=c&&c.dataset.dest;if(!d)return;
      var hit=imgCached(d);
      if(hit){if(hit[0])putPhoto(t,d,hit[0]);return;}
      todo.push([t,d]);
    });
    if(!todo.length)return;
    var go=function(t,d){imgLookup(d).then(function(u){putPhoto(t,d,u);});};
    if(!('IntersectionObserver' in window)){todo.forEach(function(x){go(x[0],x[1]);});return;}
    var map=new Map();
    io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;io.unobserve(e.target);var x=map.get(e.target);if(x)go(x[0],x[1]);});},{root:root,rootMargin:'300px 0px'});
    todo.forEach(function(x){map.set(x[0],x);io.observe(x[0]);});
  }

  function render(){
    var a=filtered(),list=root.querySelector('#dxList');
    root.querySelector('#dxCount').textContent=a.length+(a.length===1?' destinacija':(a.length>1&&a.length<5?' destinacije':' destinacija'));
    if(!a.length){list.innerHTML='<div class="dx-empty">Nema rezultata. Probaj drugi naziv ili kategoriju.</div>';return;}
    var html='';
    if(st.f==='all'&&st.s==='pop'&&!st.q){
      var G=[['Vikend do 2h',function(x){return x.tags.indexOf('weekend')>-1;}],['More',function(x){return x.tags.indexOf('sea')>-1;}],['Gradovi',function(x){return x.tags.indexOf('city')>-1;}],['Priroda',function(x){return x.tags.indexOf('nature')>-1;}],['Daleka putovanja',function(){return true;}]],used={};
      G.forEach(function(g){var b=a.filter(function(x){return !used[x.key]&&g[1](x);});b.forEach(function(x){used[x.key]=1;});if(b.length)html+='<section class="dx-group"><h2 class="dx-gh">'+g[0]+'</h2>'+grid(b)+'</section>';});
    }else html=grid(a);
    list.innerHTML=html;
    list.querySelectorAll('.dx-thumb img').forEach(function(im){im.addEventListener('error',function(){var d=im.closest('.dx-card').dataset.dest;var p=null;try{p=window.SKLOPI_destPhoto&&window.SKLOPI_destPhoto(d,500);}catch(e){}var t=im.parentNode;if(p&&im.src.indexOf(p)<0){im.src=p;return;}if(window.SKLOPI_thumbFallback)window.SKLOPI_thumbFallback(t,d);},{once:false});});
    list.querySelectorAll('.dx-thumb[data-fb]').forEach(function(t){var d=t.dataset.fb,p=null;try{p=window.SKLOPI_destPhoto&&window.SKLOPI_destPhoto(d,500);}catch(e){}if(p){t.innerHTML='<img src="'+esc(p)+'" alt="'+esc(d)+'" loading="lazy">';}else if(window.SKLOPI_thumbFallback)window.SKLOPI_thumbFallback(t,d);});
    autoPhotos(list);
  }

  function setActive(on){
    if(!nav)return;
    var links=nav.querySelectorAll('a');
    links.forEach(function(a,i){a.classList.toggle('is-active',on?a.getAttribute('href')==='#popular-destinations':false);});
  }
  function open(){
    if(!root)create();
    loadSaved();render();
    if(nav)root.style.paddingBottom=nav.offsetHeight+'px';
    root.hidden=false;
    requestAnimationFrame(function(){root.classList.add('is-open');});
    document.body.classList.add('dx-lock');setActive(true);
    root.scrollTop=0;
    if(location.hash!=='#destinacije'){try{history.pushState({dx:1},'','#destinacije');}catch(e){}}
  }
  function close(skipHistory){
    if(!root||root.hidden)return;
    root.classList.remove('is-open');
    document.body.classList.remove('dx-lock');setActive(false);
    setTimeout(function(){if(!root.classList.contains('is-open'))root.hidden=true;},200);
    if(!skipHistory&&location.hash==='#destinacije'){try{history.back();}catch(e){}}
    else if(location.hash==='#destinacije'){try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}}
  }

  function init(){
    nav=document.getElementById('bottomNav');if(!nav)return;
    nav.addEventListener('click',function(e){
      var a=e.target.closest('a');if(!a)return;
      if(a.getAttribute('href')==='#popular-destinations'){e.preventDefault();if(root&&!root.hidden&&root.classList.contains('is-open'))root.scrollTo({top:0,behavior:'smooth'});else open();}
      else close(true);
    },true);
    window.addEventListener('popstate',function(){if(location.hash!=='#destinacije')close(true);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
    if(location.hash==='#destinacije')open();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
