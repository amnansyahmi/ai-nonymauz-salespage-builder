/* Saves pages in this browser (localStorage). Falls back to memory if storage is blocked. */
(function (SP) {
  'use strict';
  var KEY = 'nonymauz.pages.v1';
  var mem = null;

  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { mem = []; }
    if (!Array.isArray(mem)) mem = [];
    return mem;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); return true; } catch (e) { return false; }
  }

  SP.store = {
    all: function () { return load().slice().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); }); },
    get: function (id) {
      var p = load().find(function (x) { return x.id === id; });
      return p ? SP.normalizePage(SP.clone(p)) : null;
    },
    /* returns false when the browser storage is full */
    put: function (page) {
      load();
      page.updatedAt = Date.now();
      var i = mem.findIndex(function (x) { return x.id === page.id; });
      var copy = SP.clone(page);
      if (i >= 0) mem[i] = copy; else mem.push(copy);
      return persist();
    },
    remove: function (id) { load(); mem = mem.filter(function (x) { return x.id !== id; }); persist(); },
    replaceAll: function (pages) { mem = pages; return persist(); }
  };

  SP.normalizePage = function (p) {
    p.id = p.id || SP.uid();
    p.theme = Object.assign(SP.defaultTheme(), p.theme || {});
    /* a named preset follows the preset's current colours; custom colours are left alone */
    var pre = SP.themes[p.theme.preset];
    if (pre) Object.assign(p.theme, { primary: pre.primary, accent: pre.accent, bg: pre.bg, text: pre.text });
    if (!SP.fonts[p.theme.font]) p.theme.font = 'moden';
    p.settings = Object.assign({ businessName: '', whatsapp: '', lang: 'ms', waFloat: true, sticky: false, stickyText: 'Order sekarang', stickyLink: '#order', seoTitle: '', seoDesc: '', pixelId: '' }, p.settings || {});
    p.blocks = (p.blocks || []).map(SP.normalizeBlock).filter(Boolean);
    return p;
  };

  SP.createFromTemplate = function (tplId) {
    var t = SP.templates.find(function (x) { return x.id === tplId; }) || SP.templates[0];
    var p = SP.normalizePage(t.build());
    p.id = SP.uid();
    p.createdAt = Date.now();
    return p;
  };
})(window.SP);
