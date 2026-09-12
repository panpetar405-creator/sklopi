(function(){
  const GA_MEASUREMENT_ID = ''; // TODO: upiši npr. 'G-XXXXXXXXXX' kad se registruješ na Google Analytics
  const CONSENT_KEY = 'skoknica_cookie_consent'; // 'accepted' | 'declined'

  const banner  = document.getElementById('cookieBanner');
  const accept  = document.getElementById('cookieAccept');
  const decline = document.getElementById('cookieDecline');
  const settingsLink = document.getElementById('cookieSettingsLink');

  function loadGA(){
    if (!GA_MEASUREMENT_ID) { console.warn('[skoknica] GA_MEASUREMENT_ID nije podešen — analitika se ne učitava.'); return; }
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  }

  function showBanner(){ banner.classList.add('show'); }
  function hideBanner(){ banner.classList.remove('show'); }

  const saved = localStorage.getItem(CONSENT_KEY);
  if (saved === 'accepted') loadGA();
  else if (saved !== 'declined') showBanner();

  accept.addEventListener('click', ()=>{
    localStorage.setItem(CONSENT_KEY, 'accepted');
    hideBanner();
    loadGA();
  });
  decline.addEventListener('click', ()=>{
    localStorage.setItem(CONSENT_KEY, 'declined');
    hideBanner();
  });
  settingsLink.addEventListener('click', (e)=>{
    e.preventDefault();
    showBanner();
  });
})();
