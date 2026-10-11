/* Redizajn ekran 10: Moji putovi — lista sačuvanih planova (sklopi_trips_v2, upisuje destinacija.html).
   Živi unutar postojeće sekcije #myTrip (sidro i navigacija ostaju isti); stari prikaz se samo sakriva CSS-om. */
(function(){
  'use strict';
  var STORE='sklopi_trips_v2',tab='active';
  function read(){try{var a=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
  function write(a){try{localStorage.setItem(STORE,JSON.stringify(a));}catch(e){}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function dmy(iso){var p=String(iso||'').split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]+'.':'';}
  function dm(iso){var p=String(iso||'').split('-');return p.length===3?p[2]+'.'+p[1]+'.':'';}
  function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function safeUrl(u){return /^destinacija\.html\?/.test(u||'')?u:'destinacija.html';}
  function safePhoto(u){return /^(img\/|https:\/\/)/.test(u||'')?u:'';}
  function render(){
    var root=document.getElementById('myTrip');if(!root)return;
    var wrap=document.getElementById('mtList');
    if(!wrap){
      wrap=document.createElement('div');wrap.id='mtList';wrap.className='mt2';
      root.appendChild(wrap);
      wrap.addEventListener('click',function(e){
        var t=e.target.closest('.mt2-tab');
        if(t){tab=t.dataset.tab;render();return;}
        var r=e.target.closest('.mt2-rm');
        if(r){var id=r.dataset.id;write(read().filter(function(x){return x.id!==id;}));render();return;}
        if(e.target.closest('.mt2-new')){var f=document.getElementById('searchForm-wrap');if(f)f.scrollIntoView({behavior:'smooth',block:'start'});}
      });
    }
    var h=root.querySelector('.ad-head h2');if(h&&h.textContent!=='Moji putovi')h.textContent='Moji putovi';
    var td=today(),all=read();
    var list=all.filter(function(x){return tab==='done'?(x.to&&x.to<td):!(x.to&&x.to<td);});
    var html='<div class="mt2-tabs"><button type="button" class="mt2-tab'+(tab==='active'?' on':'')+'" data-tab="active">Aktivni</button><button type="button" class="mt2-tab'+(tab==='done'?' on':'')+'" data-tab="done">Završeni</button></div>';
    if(!list.length){
      html+='<p class="mt2-empty">'+(tab==='done'?'Još nemaš završenih putovanja.':'Još nemaš sačuvanih planova. Izaberi destinaciju, uporedi planove i sačuvaj onaj koji ti odgovara.')+'</p>';
    }else{
      html+=list.map(function(x){
        var ph=safePhoto(x.photo);
        return '<div class="mt2-item"><a class="mt2-card" href="'+esc(safeUrl(x.url))+'">'+
          (ph?'<span class="mt2-img" style="background-image:url(\''+esc(ph)+'\')"></span>':'<span class="mt2-img"></span>')+
          '<span class="mt2-info"><b>'+esc(x.dest)+(x.days?' · '+esc(x.days)+' dana':'')+'</b>'+
          '<small>'+esc(dm(x.from))+' – '+esc(dmy(x.to))+' · '+esc(x.adults)+' '+(x.adults===1?'putnik':'putnika')+'</small>'+
          '<small class="mt2-plan">Plan: '+esc(x.plan)+'</small>'+
          '<span class="mt2-price">'+esc(Number(x.total).toLocaleString('sr-RS'))+' '+esc(x.cs||'€')+'</span></span><span class="mt2-chev" aria-hidden="true">›</span></a>'+
          '<button type="button" class="mt2-rm" data-id="'+esc(x.id)+'">Ukloni</button></div>';
      }).join('');
    }
    html+='<button type="button" class="mt2-new">+ Novi plan</button>';
    if(wrap.dataset.h!==html){wrap.dataset.h=html;wrap.innerHTML=html;}
  }
  document.addEventListener('DOMContentLoaded',render);
  window.addEventListener('load',render);
  window.addEventListener('storage',render);
  window.addEventListener('pageshow',render);
})();
