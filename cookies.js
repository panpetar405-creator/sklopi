// PRIVREMENI minimalni stub za lokalno testiranje banera za kolačiće.
// Originalni cookies.js (sa pravom GA integracijom) nije bio deo fajlova
// koje si poslao na analizu — ovo samo omogućava da dugmad rade vizuelno.
(function(){
  var banner = document.getElementById('cookieBanner');
  var accept = document.getElementById('cookieAccept');
  var decline = document.getElementById('cookieDecline');
  var settingsLink = document.getElementById('cookieSettingsLink');
  if (!banner) return;

  var choice = localStorage.getItem('skoknica_cookie_choice');
  if (!choice) banner.classList.add('show');

  function hide(){ banner.classList.remove('show'); }

  if (accept) accept.addEventListener('click', function(){
    localStorage.setItem('skoknica_cookie_choice', 'accepted');
    hide();
  });
  if (decline) decline.addEventListener('click', function(){
    localStorage.setItem('skoknica_cookie_choice', 'declined');
    hide();
  });
  if (settingsLink) settingsLink.addEventListener('click', function(e){
    e.preventDefault();
    banner.classList.add('show');
  });
})();
