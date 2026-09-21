/* SKLOPI kontakt — adresa i broj nisu upisani u HTML, pa ih ne vide botovi
   koji čitaju samo izvorni kod. Sklapaju se tek kad posetilac klikne. */
(function () {
  var M = ["Y29t", "aWwu", "Z21h", "MDVA", "YXI0", "cGV0", "cGFu"];
  var W = ["NjE=", "Nzgz", "Njg1", "Mzgy"];
  function dec(a) { return atob(a.slice().reverse().join('')); }
  var MSG = 'Zdravo, imam pitanje o SKLOPI putovanju';

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-contact]');
    if (!el) return;
    e.preventDefault();
    var kind = el.getAttribute('data-contact');
    if (kind === 'mail') {
      var mail = dec(M);
      if (el.hasAttribute('data-show')) el.textContent = mail;
      window.location.href = 'mailto:' + mail;
    } else if (kind === 'wa') {
      window.open('https://wa.me/' + dec(W) + '?text=' + encodeURIComponent(MSG), '_blank', 'noopener');
    }
  });
})();
