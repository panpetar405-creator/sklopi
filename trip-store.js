/* trip-store.js — jedno mesto za stanje putovanja (TripStore).

   ŠTA JE "PUTOVANJE":
     polja pretrage  dest, origin, from, to, adults   — vlasnik je i dalje DOM (#dest, #origin, #dateFrom, #dateTo, #adults);
                                                         store ih samo ČITA u trenutku snapshot-a (nema keširanja → nema neslaganja)
     izbor           sel   = builderState (let/hotel/auto/aktivnosti/dodaci/budžet)  — živi OVDE, preko Proxy-ja
     aktivni plan    window.SKLOPI_ACTIVE_PLAN                                       — živi OVDE, preko accessor-a
     procena         window._lastBuilderPkg (+ total)                                — živi OVDE, preko accessor-a

   KOMPATIBILNOST: ostatak koda se ne menja. `builderState.x = y`, `Object.assign(builderState, {...})`,
   `window.SKLOPI_ACTIVE_PLAN = p` i `window._lastBuilderPkg = pkg` rade isto kao pre — samo što sad
   svaka PROMENA javlja pretplatnicima (subscribe), grupisano u jedan poziv po mikrotasku.

   DELJENJE: serialize()/parse()/toHash()/fromHash() daju kompaktan, VALIDIRAN zapis putovanja koji može u URL
   (#t=…) ili u `trips.selection` — bez naloga. parse() NIKAD ne veruje ulazu: prihvata samo poznate ključeve
   sa očekivanim tipovima i opsezima. Ovaj fajl ne dira DOM niti mrežu (osim čitanja polja pretrage). */
(function(root){
  'use strict';

  var VERSION = 1;
  var FIELD_IDS = { dest:'dest', origin:'origin', from:'dateFrom', to:'dateTo', adults:'adults' };
  var ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  var MAX_ADULTS = 20;
  var MAX_TEXT = 60;                       // isto kao maxlength na #dest / #origin
  var DEV = !!(root.location && (/^(localhost|127\.0\.0\.1)$/.test(root.location.hostname) || /[?&]debug\b/.test(root.location.search || '')));

  var listeners = [];
  var queued = false;
  var pending = {};                        // šta se promenilo od poslednjeg javljanja
  var defaults = null;                     // oblik i tipovi izbora (BUILDER_DEFAULTS)
  var sel = null;                          // Proxy oko builderState
  var plan;                                // aktivni plan (objekat iz buildPlans) ili undefined
  var pkg;                                 // poslednji izračunati paket (builder)

  function schedule(what){
    pending[what] = true;
    if (queued) return;
    queued = true;
    Promise.resolve().then(function(){
      queued = false;
      var changed = Object.keys(pending); pending = {};
      var snap = api.snapshot();
      listeners.slice().forEach(function(fn){
        try { fn(snap, changed); } catch(e){ if (DEV && root.console) console.warn('[TripStore] pretplatnik je pao:', e); }
      });
    });
  }

  function field(key){
    var el = root.document && root.document.getElementById(FIELD_IDS[key]);
    return el ? String(el.value == null ? '' : el.value).trim() : '';
  }

  function cleanText(v){
    if (typeof v !== 'string') return null;
    var s = v.replace(/[\u0000-\u001f\u007f<>]/g, '').trim();
    return s && s.length <= MAX_TEXT ? s : null;
  }

  function typeOk(def, v){
    if (def === null) return v === null || (typeof v === 'number' && isFinite(v) && v >= 0 && v <= 1e6);   // budget
    return typeof v === typeof def;
  }

  function cleanSel(input){
    var out = {};
    if (!defaults || !input || typeof input !== 'object') return out;
    Object.keys(defaults).forEach(function(k){
      if (!Object.prototype.hasOwnProperty.call(input, k)) return;
      var v = input[k];
      if (!typeOk(defaults[k], v)) return;
      if (typeof v === 'string' && v.length > MAX_TEXT) return;
      if (typeof v === 'number' && k !== 'budget' && (v < 0 || v > 50)) return;   // brojači (zvezdice, aktivnosti...)
      out[k] = v;
    });
    return out;
  }

  var api = {
    version: VERSION,

    /* Obavi builderState u Proxy: svaka stvarna promena javlja 'selection'. Poziva se jednom, iz app-06-form.js. */
    bindSelection: function(target){
      defaults = JSON.parse(JSON.stringify(target));
      sel = new Proxy(target, {
        set: function(t, k, v){
          var changed = t[k] !== v;
          t[k] = v;
          if (changed) schedule('selection');
          return true;
        },
        deleteProperty: function(t, k){ if (k in t) schedule('selection'); return delete t[k]; }
      });
      return sel;
    },

    /* window.SKLOPI_ACTIVE_PLAN i window._lastBuilderPkg ostaju isti za ceo kod, ali prolaze kroz store. */
    attach: function(){
      Object.defineProperty(root, 'SKLOPI_ACTIVE_PLAN', {
        configurable:true, enumerable:true,
        get: function(){ return plan; },
        set: function(v){ if (v !== plan){ plan = v; schedule('plan'); } }
      });
      Object.defineProperty(root, '_lastBuilderPkg', {
        configurable:true, enumerable:true,
        get: function(){ return pkg; },
        set: function(v){ if (v !== pkg){ pkg = v; schedule('estimate'); } }
      });
      var doc = root.document;
      if (doc && doc.addEventListener){
        var ids = Object.keys(FIELD_IDS).map(function(k){ return FIELD_IDS[k]; });
        var onForm = function(e){ if (e.target && ids.indexOf(e.target.id) !== -1) schedule('form'); };
        doc.addEventListener('input', onForm, true);
        doc.addEventListener('change', onForm, true);
      }
      return api;
    },

    subscribe: function(fn){
      if (typeof fn !== 'function') return function(){};
      listeners.push(fn);
      return function(){ var i = listeners.indexOf(fn); if (i !== -1) listeners.splice(i, 1); };
    },

    /* Trenutno stanje kao običan objekat (kopija — izmena kopije ne menja store). */
    snapshot: function(){
      var total = pkg && typeof pkg.total === 'number' && isFinite(pkg.total) ? pkg.total : null;
      return {
        v: VERSION,
        dest: field('dest'), origin: field('origin'), from: field('from'), to: field('to'),
        adults: Number(field('adults')) || 2,
        sel: sel ? Object.assign({}, sel) : {},
        planKey: plan && plan.key != null ? String(plan.key) : null,
        total: total
      };
    },

    /* Validira PROIZVOLJAN ulaz (iz URL-a, baze, share linka) → čist objekat ili null. */
    parse: function(input){
      var o = input;
      if (typeof o === 'string'){ try { o = JSON.parse(o); } catch(e){ return null; } }
      if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
      if (o.v !== VERSION) return null;
      var dest = cleanText(o.dest);
      if (!dest) return null;                                  // bez destinacije putovanje nema smisla
      var out = { v: VERSION, dest: dest, origin: cleanText(o.origin) || '', adults: 2, sel: cleanSel(o.sel), planKey: null, total: null };
      var a = Number(o.adults);
      if (isFinite(a) && a >= 1 && a <= MAX_ADULTS && Math.floor(a) === a) out.adults = a;
      if (typeof o.from === 'string' && ISO_DATE.test(o.from) && typeof o.to === 'string' && ISO_DATE.test(o.to)){
        var f = Date.parse(o.from + 'T00:00:00Z'), t = Date.parse(o.to + 'T00:00:00Z');
        if (isFinite(f) && isFinite(t) && t >= f && (t - f) / 86400000 <= 60){ out.from = o.from; out.to = o.to; }
      }
      if (typeof o.planKey === 'string' && o.planKey.length <= 40 && /^[\w-]*$/.test(o.planKey)) out.planKey = o.planKey || null;
      if (typeof o.total === 'number' && isFinite(o.total) && o.total >= 0 && o.total <= 1e6) out.total = Math.round(o.total);
      return out;
    },

    serialize: function(){ return JSON.stringify(api.snapshot()); },

    /* Primeni VALIDIRANE izbore na builderState (ne dira polja pretrage — to radi pozivalac kad je spreman). */
    applySelection: function(parsed){
      if (!parsed || !sel) return false;
      Object.assign(sel, parsed.sel || {});
      return true;
    },

    /* URL-bezbedan zapis (#t=<base64url>). Radi i u pregledaču i u Node-u. */
    toHash: function(snap){
      var json = JSON.stringify(snap || api.snapshot());
      var b64 = typeof Buffer !== 'undefined' ? Buffer.from(json, 'utf8').toString('base64')
        : root.btoa(unescape(encodeURIComponent(json)));
      return '#t=' + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    fromHash: function(hash){
      var m = /^#?t=([A-Za-z0-9_-]{1,4000})$/.exec(String(hash || ''));
      if (!m) return null;
      try {
        var b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        var json = typeof Buffer !== 'undefined' ? Buffer.from(b64, 'base64').toString('utf8')
          : decodeURIComponent(escape(root.atob(b64)));
        return api.parse(json);
      } catch(e){ return null; }
    }
  };

  root.TripStore = api;
  if (root.document) api.attach();
})(typeof window !== 'undefined' ? window : globalThis);
