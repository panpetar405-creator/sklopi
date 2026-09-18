// Kolačići + Google Analytics (GA4).
// GA se učitava SAMO ako korisnik prihvati kolačiće (dugme "Prihvatam"),
// u skladu sa tekstom u baneru ("Koristimo kolačiće za analitiku...
// Google Analytics. Ne koristimo ih za marketing niti ih delimo van
// Google-a."). Pravi Measurement ID ide u config.js (window.SKLOPI_GA_ID);
// dok je tamo placeholder 'G-XXXXXXXXXX', loadGA() se prekida ranije i
// ništa se ne šalje ka Google-u.
(function(){
  function loadGA(){
    var id = window.SKLOPI_GA_ID;
    if (!id || id === 'G-XXXXXXXXXX') return;
    if (window._gaLoaded) return;
    window._gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // anonymize_ip: srpski/EU posetioci, nema potrebe da čuvamo pun IP.
    window.gtag('config', id, {anonymize_ip:true});
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(s);
  }

  var choice = localStorage.getItem('sklopi_cookie_choice');
  // Učitaj GA odmah ako je korisnik ranije već prihvatio — ovo radi na
  // SVAKOJ stranici (index.html, privatnost.html, itd.), ne samo onima
  // koje imaju banner u DOM-u.
  if (choice === 'accepted') loadGA();

  var banner = document.getElementById('cookieBanner');
  if (!banner) return; // stranica nema banner-UI (npr. privatnost.html) — GA logika iznad je ipak već odrađena

  var accept = document.getElementById('cookieAccept');
  var decline = document.getElementById('cookieDecline');
  var settingsLink = document.getElementById('cookieSettingsLink');

  if (!choice) banner.classList.add('show');

  function hide(){ banner.classList.remove('show'); }

  if (accept) accept.addEventListener('click', function(){
    localStorage.setItem('sklopi_cookie_choice', 'accepted');
    hide();
    loadGA();
  });
  if (decline) decline.addEventListener('click', function(){
    localStorage.setItem('sklopi_cookie_choice', 'declined');
    hide();
  });
  if (settingsLink) settingsLink.addEventListener('click', function(e){
    e.preventDefault();
    banner.classList.add('show');
  });
})();
