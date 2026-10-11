/* Redizajn ekran 2: istaknuta destinacija prosleđuje klik na postojeću karticu (Atina),
   a cena se uzima iz iste kartice da ostane usklađena. */
(function(){
  function card(){return document.querySelector('#popularDestGrid .popular-dest-card[data-dest="Atina"]');}
  function sync(){
    var c=card(),p=c&&c.querySelector('.pd-price'),t=document.querySelector('[data-home-feat-price]');
    if(p&&t&&p.textContent.trim())t.textContent=p.textContent.trim();
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.dest-featured');
    if(!b)return;
    var c=card();
    if(c)c.click();
  });
  window.addEventListener('load',function(){sync();setTimeout(sync,1500);});
})();
