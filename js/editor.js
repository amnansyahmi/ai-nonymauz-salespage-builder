/* The builder app: home screen (templates + my pages) and the drag-and-drop editor. */
(function (SP) {
  'use strict';
  var esc = SP.esc, icon = SP.icon;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var app = $('#app');

  var S = { page: null, sel: null, device: 'desktop', hist: [], fut: [], lastKey: null, lastT: 0, drawer: null, saveTimer: 0 };

  /* ---------- small UI helpers ---------- */
  function h(tag, attrs, html) {
    var el = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === 'class') el.className = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    if (html != null) el.innerHTML = html;
    return el;
  }
  var toastTimer;
  function toast(msg, action) {
    var t = $('#toast');
    if (!t) { t = h('div', { id: 'toast', class: 'toast', role: 'status' }); document.body.appendChild(t); }
    t.innerHTML = '<span>' + esc(msg) + '</span>';
    if (action) t.appendChild(h('button', { type: 'button', onclick: function () { action.fn(); t.classList.remove('on'); } }, esc(action.label)));
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, action ? 6000 : 2600);
  }
  function copyText(text, okMsg) {
    var done = function () { toast(okMsg || 'Copied'); };
    var fallback = function () {
      var ta = h('textarea', { class: 'copy-fallback', readonly: true });
      ta.value = text; document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      ok ? done() : toast('Copy blocked by the browser. Use the Download button instead.');
    };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
  }

  /* Shrink photos before saving so pages stay light and fast. */
  function readImage(file) {
    return new Promise(function (res, rej) {
      if (!/^image\//.test(file.type)) return rej(new Error('type'));
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var max = 1200, k = Math.min(1, max / Math.max(im.width, im.height));
          var c = document.createElement('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.82));
        };
        im.onerror = rej;
        im.src = fr.result;
      };
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  function pageFrame(page, ctx, extraClass) {
    var s = page.settings;
    return '<div class="' + SP.pageClass(page, extraClass) + '" style="' + esc(SP.themeVars(page.theme)) + '">' + SP.renderPage(page, ctx) + '</div>';
  }

  /* A picture of the seller's page, drawn in its own sandboxed frame so its styles stay its own. */
  function thumbFrame(page, width) {
    var doc = '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="' + SP.fontsURL([page.theme.font]) + '">' +
      '<style>html,body{margin:0;overflow:hidden}' + SP.pageCSS + '.sp-fixed{display:none}</style></head><body>' +
      pageFrame(page, { editor: true, thumb: true }) + '</body></html>';
    return '<iframe class="tframe" title="" tabindex="-1" aria-hidden="true" sandbox="" loading="lazy" style="width:' + width + 'px" srcdoc="' + esc(doc) + '"></iframe>';
  }

  /* ================= ROUTING ================= */
  function route() {
    var hash = location.hash.slice(1);
    if (hash.indexOf('edit-') === 0) {
      var p = SP.store.get(hash.slice(5));
      if (p) return openEditor(p);
    }
    S.page = null;
    renderHome();
  }
  window.addEventListener('hashchange', route);

  /* ================= HOME ================= */
  /* Question this screen answers: "Which of my pages can take orders, and what do I edit next?" */
  var BACKUP_KEY = 'nonymauz.lastBackup';
  function lastBackup() { try { return +localStorage.getItem(BACKUP_KEY) || 0; } catch (e) { return 0; } }
  function fmtPhone(d) {
    if (!d) return '';
    var m = String(d).match(/^60(\d{2})(\d{3,4})(\d{4})$/);
    return m ? '+60 ' + m[1] + '-' + m[2] + ' ' + m[3] : '+' + d;
  }
  function relDate(ts) {
    if (!ts) return '—';
    var d = new Date(ts), now = new Date();
    var day = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var diff = Math.round((day(now) - day(d)) / 864e5);
    var time = d.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' });
    if (diff === 0) return 'Today, ' + time;
    if (diff === 1) return 'Yesterday, ' + time;
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
  }
  /* Facts about a page, computed from its own sections. */
  function pageFacts(p) {
    var order = p.blocks.find(function (b) { return b.type === 'order'; });
    var prices = order ? order.props.items.map(function (i) { return Number(i.price) || 0; }) : [];
    var min = prices.length ? Math.min.apply(null, prices) : 0, max = prices.length ? Math.max.apply(null, prices) : 0;
    var wa = SP.waNumber(p.settings.whatsapp);
    var status = !order ? { cls: 'neutral', text: 'No order form' } : !wa ? { cls: 'warn', text: 'No WhatsApp number' } : { cls: 'ok', text: 'Ready to share' };
    return {
      sections: p.blocks.length, packages: prices.length, wa: wa, hasOrder: !!order, status: status,
      range: !prices.length ? '—' : (min === max ? SP.money(min) : SP.money(min) + '–' + SP.money(max))
    };
  }
  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };

  function renderHome() {
    document.title = 'Salespages · Nonymauz';
    var pages = SP.store.all().map(function (pg) { return SP.normalizePage(SP.clone(pg)); });
    var facts = pages.map(pageFacts);
    var notReady = facts.filter(function (f) { return f.hasOrder && !f.wa; }).length;
    var bk = lastBackup();
    var sub;
    if (!pages.length) sub = 'Pick a template below to make your first page. It takes about 10 minutes.';
    else {
      sub = notReady ? '<b>' + plural(notReady, 'page', 'pages') + ' can’t take orders yet:</b> add a WhatsApp number. ' : '<b>All pages can take orders.</b> ';
      sub += bk ? 'Last backup ' + relDate(bk).toLowerCase() + '.' : 'Not backed up yet. Pages are saved only in this browser.';
    }
    app.className = 'v-home';
    app.innerHTML =
      '<header class="topbar"><a class="wordmark" href="#">' + logo() + 'Nonymauz</a>' +
      '<div class="topbar-r"><button type="button" class="btn" id="btn-backup" title="Download a backup of all pages">' + icon('download') + '<span>Back up pages</span></button>' +
      '<label class="btn tertiary" for="restore-file" title="Restore pages from a backup file">' + icon('upload') + '<span>Restore</span></label><input type="file" id="restore-file" accept="application/json,.json" hidden></div></header>' +
      '<main class="sheet"><div class="col">' +
      '<div class="title-row"><div><h1>Salespages</h1><p class="subline">' + sub + '</p></div>' +
      '<button type="button" class="btn primary" id="btn-new">' + icon('plus') + 'New page</button></div>' +

      '<section class="block" aria-labelledby="h-pages"><div class="block-h"><h2 id="h-pages">Your pages</h2>' + (pages.length ? '<p class="num">' + plural(pages.length, 'page', 'pages') + '</p>' : '') + '</div>' +
      (pages.length ? '<table class="ptable"><thead><tr><th>Page</th><th class="num c-price">Prices</th><th class="c-wa">Orders go to</th><th class="num c-date">Edited</th><th><span class="sr">Actions</span></th></tr></thead><tbody>' +
        pages.map(function (p, i) {
          var f = facts[i];
          var mini = SP.clone(p); mini.blocks = mini.blocks.slice(0, 1);
          var waCell = f.wa ? '<span class="num">' + esc(fmtPhone(f.wa)) + '</span>' : '<span class="pill ' + f.status.cls + '">' + f.status.text + '</span>';
          return '<tr data-id="' + p.id + '"><td><div class="pcell"><div class="mini" data-open aria-hidden="true">' + thumbFrame(mini, 800) + '</div>' +
            '<div><a class="pname" href="#edit-' + p.id + '">' + esc(p.name) + '</a><span class="sub">' + plural(f.sections, 'section', 'sections') + (f.packages ? ' · ' + plural(f.packages, 'package', 'packages') : '') + '</span>' +
            '<span class="sub sub-phone"><span class="pill ' + f.status.cls + '">' + f.status.text + '</span><span class="num">' + f.range + '</span><span>' + relDate(p.updatedAt) + '</span></span></div></div></td>' +
            '<td class="num c-price">' + f.range + '</td><td class="c-wa">' + waCell + '</td><td class="num c-date">' + relDate(p.updatedAt) + '</td>' +
            '<td class="acts"><a class="btn sm" href="#edit-' + p.id + '">Edit</a> <button type="button" class="icon-btn" data-menu aria-haspopup="true" aria-expanded="false" aria-label="More actions for ' + esc(p.name) + '">' + icon('more') + '</button></td></tr>';
        }).join('') + '</tbody></table>'
        : '<div class="empty-slot">No pages yet. Your pages will be listed here with their prices and the WhatsApp number orders go to.</div>') +
      '</section>' +

      '<section class="block" id="templates" aria-labelledby="h-tpl"><div class="block-h"><h2 id="h-tpl">Start from a template</h2><p>Every template has an order form that sends to WhatsApp.</p></div><div class="tpl-grid">' +
      SP.templates.map(function (t) {
        var p = SP.normalizePage(t.build()), f = pageFacts(p);
        var thumb = SP.clone(p); thumb.blocks = thumb.blocks.slice(0, 3);
        return '<article class="tpl" data-tpl="' + t.id + '"><div class="thumb" aria-hidden="true">' + thumbFrame(thumb, 1200) + '</div>' +
          '<div class="tpl-meta"><b>' + esc(t.name) + '</b><span>' + esc(t.desc) + '</span><span class="sub num">' + plural(f.sections, 'section', 'sections') + ' · ' + plural(f.packages, 'package', 'packages') + ' · ' + SP.themes[p.theme.preset].label + ' colours</span></div>' +
          '<button type="button" class="tpl-go"><span>Use the ' + esc(t.name) + ' template</span></button></article>';
      }).join('') + '</div></section>' +
      '</div></main>';

    var fit = function (t) { if (t.clientWidth) t.style.setProperty('--k', (t.clientWidth / 1200).toFixed(4)); };
    if (window.ResizeObserver) { var ro = new ResizeObserver(function (es) { es.forEach(function (e) { fit(e.target); }); }); $$('.thumb', app).forEach(function (t) { ro.observe(t); }); }
    else $$('.thumb', app).forEach(fit);
    $$('.tpl', app).forEach(function (card) {
      $('.tpl-go', card).addEventListener('click', function () {
        var p = SP.createFromTemplate(card.getAttribute('data-tpl'));
        if (!SP.store.put(p)) return toast('Browser storage is full. Delete an old page or use smaller photos.');
        location.hash = 'edit-' + p.id;
      });
    });
    $('#btn-new').addEventListener('click', function () {
      var t = $('#templates');
      t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      $('.tpl-go', t).focus({ preventScroll: true });
    });
    $$('.ptable tr[data-id]', app).forEach(function (row) {
      var id = row.getAttribute('data-id');
      var name = $('.pname', row).textContent;
      row.addEventListener('click', function (e) {
        if (e.target.closest('[data-open]')) { location.hash = 'edit-' + id; return; }
        var mb = e.target.closest('[data-menu]');
        if (mb) { e.stopPropagation(); openRowMenu(row, mb, id, name); }
      });
    });
    $('#btn-backup').addEventListener('click', function () {
      var ok = SP.download('nonymauz-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ app: 'nonymauz', version: 1, pages: SP.store.all() }), 'application/json');
      if (ok) { try { localStorage.setItem(BACKUP_KEY, String(Date.now())); } catch (x) {} }
      toast(ok ? 'Backup downloaded' : 'Download is blocked here. Open the builder in a normal browser tab.');
      if (ok) renderHome();
    });
    $('#restore-file').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (!f) return;
      f.text().then(function (txt) {
        var data = JSON.parse(txt);
        var incoming = (data.pages || []).map(SP.normalizePage);
        var cur = SP.store.all();
        incoming.forEach(function (p) { if (!cur.some(function (c) { return c.id === p.id; })) cur.push(p); });
        SP.store.replaceAll(cur);
        toast('Restored ' + plural(incoming.length, 'page', 'pages'));
        renderHome();
      }).catch(function () { toast('That file is not a Nonymauz backup.'); });
    });
  }

  function closeMenus() { $$('.menu').forEach(function (m) { var b = m.parentNode.querySelector('[data-menu]'); if (b) b.setAttribute('aria-expanded', 'false'); m.remove(); }); }
  document.addEventListener('click', function (e) { if (!e.target.closest('.menu')) closeMenus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(); });
  function openRowMenu(row, btn, id, name) {
    var open = btn.getAttribute('aria-expanded') === 'true';
    closeMenus();
    if (open) return;
    btn.setAttribute('aria-expanded', 'true');
    var m = h('div', { class: 'menu', role: 'menu' });
    var item = function (label, ic, cls, fn) { var b = h('button', { type: 'button', role: 'menuitem', class: cls || '' }, icon(ic) + esc(label)); b.addEventListener('click', fn); m.appendChild(b); return b; };
    item('Duplicate', 'copy', '', function () {
      var p = SP.store.get(id); p.id = SP.uid(); p.name += ' (copy)';
      closeMenus();
      SP.store.put(p) ? (toast('Duplicated ' + name), renderHome()) : toast('Browser storage is full.');
    });
    item('Delete page…', 'trash', 'danger', function (e) {
      e.stopPropagation();
      m.innerHTML = '<p>Delete “' + esc(name) + '”? Its sections and photos are removed from this browser.</p>';
      var r = h('div', { class: 'row' });
      var del = h('button', { type: 'button', class: 'btn sm danger-fill' }, 'Delete page');
      var cancel = h('button', { type: 'button', class: 'btn sm' }, 'Cancel');
      del.addEventListener('click', function () { SP.store.remove(id); closeMenus(); toast('Deleted ' + name); renderHome(); });
      cancel.addEventListener('click', closeMenus);
      r.appendChild(del); r.appendChild(cancel); m.appendChild(r);
      cancel.focus();
    });
    $('.acts', row).appendChild(m);
    $('button', m).focus();
  }

  /* The product's mark: a page with a chat tail, in the accent. */
  function logo() {
    return '<svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H10l-5 3.5V18a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="var(--accent)"/><path d="M7.5 7.5h9M7.5 10.75h5.5M7.5 14h7" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>';
  }

  /* ================= EDITOR ================= */
  function openEditor(page) {
    S.page = page; S.sel = null; S.hist = []; S.fut = []; S.drawer = null;
    document.title = page.name + ' · Nonymauz';
    app.className = 'v-editor';
    app.innerHTML =
      '<div class="ed" id="ed">' +
      '<header class="ed-top">' +
      '<a class="icon-btn" href="#" title="Back to salespages" aria-label="Back to salespages">' + icon('back') + '</a>' +
      '<input id="page-name" class="ed-name" value="' + esc(page.name) + '" aria-label="Page name" maxlength="60">' +
      '<span id="status-pill"></span><span id="save-state" class="save-state">Saved</span>' +
      '<div class="ed-r">' +
      '<div class="seg ed-device" role="group" aria-label="Preview size">' +
      '<button type="button" data-dev="desktop" class="on" title="Computer view" aria-label="Computer view">' + icon('desktop') + '<span>Computer</span></button>' +
      '<button type="button" data-dev="mobile" title="Phone view" aria-label="Phone view">' + icon('mobile') + '<span>Phone</span></button></div>' +
      '<span class="vdiv" aria-hidden="true"></span>' +
      '<button type="button" class="icon-btn" id="btn-undo" title="Undo (Ctrl+Z)" aria-label="Undo">' + icon('undo') + '</button>' +
      '<button type="button" class="icon-btn" id="btn-redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">' + icon('redo') + '</button>' +
      '<span class="vdiv" aria-hidden="true"></span>' +
      '<button type="button" class="btn" id="btn-preview" aria-label="Preview">' + icon('eye') + '<span>Preview</span></button>' +
      '<button type="button" class="btn primary" id="btn-publish" aria-label="Publish">' + icon('download') + '<span>Publish</span></button></div></header>' +
      '<aside class="ed-lib" id="lib" aria-label="Sections"></aside>' +
      '<main class="ed-canvas" id="canvas"><h1 class="sr" id="ed-h1">' + esc(page.name) + '</h1><div class="ed-frame" id="frame"><div class="drop-line" id="drop-line" hidden></div><div id="page-root"></div></div></main>' +
      '<aside class="ed-insp" id="insp" aria-label="Edit"></aside>' +
      '<nav class="ed-tabs" aria-label="Panels"><button type="button" data-drawer="lib">' + icon('plus') + 'Add section</button>' +
      '<button type="button" data-drawer="insp">' + icon('sliders') + '<span id="tab-edit-label">Page settings</span></button></nav>' +
      '<div class="ed-scrim" id="scrim"></div></div>';

    renderLibrary(); renderCanvas(); renderInspector(); updateUndo(); updateStatus();

    $('#page-name').addEventListener('input', function (e) {
      mutate('name', function () { S.page.name = e.target.value || 'Untitled page'; }, { canvas: false });
      document.title = S.page.name + ' · Nonymauz';
      $('#ed-h1').textContent = S.page.name;
    });
    $$('.ed-device button').forEach(function (b) {
      b.addEventListener('click', function () {
        S.device = b.getAttribute('data-dev');
        $$('.ed-device button').forEach(function (x) { x.classList.toggle('on', x === b); });
        $('#frame').classList.toggle('mobile', S.device === 'mobile');
      });
    });
    $('#frame').classList.toggle('mobile', S.device === 'mobile');
    $$('.ed-device button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-dev') === S.device); });
    $('#btn-undo').addEventListener('click', undo);
    $('#btn-redo').addEventListener('click', redo);
    $('#btn-preview').addEventListener('click', openPreview);
    $('#btn-publish').addEventListener('click', openPublish);
    $$('.ed-tabs button').forEach(function (b) {
      b.addEventListener('click', function () { setDrawer(S.drawer === b.getAttribute('data-drawer') ? null : b.getAttribute('data-drawer')); });
    });
    $('#scrim').addEventListener('click', function () { setDrawer(null); });
    bindCanvas();
  }

  function setDrawer(name) {
    S.drawer = name;
    var ed = $('#ed');
    if (!ed) return;
    ed.classList.toggle('drawer-lib', name === 'lib');
    ed.classList.toggle('drawer-insp', name === 'insp');
    $$('.ed-tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-drawer') === name); });
  }
  var narrow = function () { return window.matchMedia('(max-width: 960px)').matches; };

  /* ---------- history + saving ---------- */
  function snapshot(key) {
    var now = Date.now();
    if (key && key === S.lastKey && now - S.lastT < 900) { S.lastT = now; return; }
    S.hist.push(JSON.stringify(S.page));
    if (S.hist.length > 80) S.hist.shift();
    S.fut = []; S.lastKey = key; S.lastT = now;
  }
  function mutate(key, fn, opts) {
    opts = opts || {};
    snapshot(key);
    fn();
    if (opts.canvas !== false) renderCanvas();
    if (opts.insp) renderInspector();
    if (opts.lib) renderLibrary();
    scheduleSave(); updateUndo(); updateStatus(); refreshPreviews();
  }
  function scheduleSave() {
    var st = $('#save-state');
    if (st) { st.textContent = 'Saving…'; st.classList.remove('err'); }
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(saveNow, 450);
  }
  function saveNow() {
    clearTimeout(S.saveTimer);
    if (!S.page) return;
    var ok = SP.store.put(S.page);
    var st = $('#save-state');
    if (st) { st.textContent = ok ? 'Saved ' + new Date().toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' }) : 'Not saved: storage full'; st.classList.toggle('err', !ok); }
    if (!ok) toast('Browser storage is full. Use smaller photos or delete old pages.');
  }
  function restore(json) {
    S.page = JSON.parse(json);
    if (S.sel && !S.page.blocks.some(function (b) { return b.id === S.sel; })) S.sel = null;
    $('#page-name').value = S.page.name;
    renderCanvas(); renderInspector(); scheduleSave(); updateUndo(); updateStatus();
  }
  function undo() { if (!S.hist.length) return; S.fut.push(JSON.stringify(S.page)); S.lastKey = null; restore(S.hist.pop()); }
  function redo() { if (!S.fut.length) return; S.hist.push(JSON.stringify(S.page)); S.lastKey = null; restore(S.fut.pop()); }
  function updateUndo() {
    var u = $('#btn-undo'), r = $('#btn-redo');
    if (u) u.disabled = !S.hist.length;
    if (r) r.disabled = !S.fut.length;
  }
  window.addEventListener('beforeunload', function () { if (S.page) saveNow(); });

  /* ---------- library (left) ---------- */
  function renderLibrary() {
    var lib = $('#lib');
    lib.innerHTML = '<div class="panel-head"><h2>Sections</h2><p>Drag onto the page, or tap to add.</p></div>' +
      SP.libraryGroups.map(function (g) {
        return '<div class="lib-group"><h3>' + esc(g.label) + '</h3><div class="lib-items">' + g.items.map(function (type) {
          var d = SP.blocks[type];
          return '<button type="button" class="lib-item" draggable="true" data-type="' + type + '" title="' + esc(d.hint) + '"><span class="tile">' + icon(d.icon) + '</span><span class="lib-l">' + esc(d.label) + '</span>' + icon('grip', 'grip') + '</button>';
        }).join('') + '</div></div>';
      }).join('');
    $$('.lib-item', lib).forEach(function (b) {
      var type = b.getAttribute('data-type');
      b.addEventListener('click', function () {
        var idx = S.page.blocks.length;
        if (S.sel) idx = S.page.blocks.findIndex(function (x) { return x.id === S.sel; }) + 1;
        addBlock(type, idx);
      });
      b.addEventListener('dragstart', function (e) { drag = { type: type }; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', type); $('#ed').classList.add('dragging'); });
      b.addEventListener('dragend', endDrag);
    });
  }
  function addBlock(type, idx) {
    var b = SP.makeBlock(type);
    mutate(null, function () { S.page.blocks.splice(idx, 0, b); S.sel = b.id; }, { insp: true });
    setDrawer(narrow() ? 'insp' : null);
    scrollToBlock(b.id);
    toast(SP.blocks[type].label + ' added');
  }
  function scrollToBlock(id) {
    requestAnimationFrame(function () {
      var el = $('.ed-blk[data-id="' + id + '"]');
      if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    });
  }

  /* ---------- canvas (centre) ---------- */
  function renderCanvas() {
    var root = $('#page-root');
    if (!root) return;
    var p = S.page, s = p.settings;
    var ctx = { editor: true, lang: s.lang, settings: s, look: p.theme.look };
    var html = p.blocks.map(function (b, i) {
      var d = SP.blocks[b.type];
      return '<div class="ed-blk' + (b.id === S.sel ? ' sel' : '') + '" data-id="' + b.id + '">' +
        '<div class="ed-bar"><span class="ed-grip" draggable="true" title="Drag to move" aria-hidden="true">' + icon('grip') + '</span>' +
        '<span class="ed-bname">' + esc(d.label) + '</span>' +
        '<button type="button" data-a="up" title="Move up" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>' + icon('up') + '</button>' +
        '<button type="button" data-a="down" title="Move down" aria-label="Move down"' + (i === p.blocks.length - 1 ? ' disabled' : '') + '>' + icon('down') + '</button>' +
        '<button type="button" data-a="dup" title="Duplicate" aria-label="Duplicate">' + icon('copy') + '</button>' +
        '<button type="button" data-a="del" title="Delete" aria-label="Delete">' + icon('trash') + '</button></div>' +
        SP.renderSection(b, ctx) + '</div>';
    }).join('');
    if (!p.blocks.length) {
      html = '<div class="ed-empty">' + icon('plus') + '<b>Your page is empty</b><span>Drag a section here from the left, or tap “Add section”.</span></div>';
    }
    if (p.theme.look === 'stage' && p.blocks.length) html = SP.wrapStage(p, ctx, html);
    root.innerHTML = '<div class="' + SP.pageClass(p) + '" style="' + esc(SP.themeVars(p.theme)) + '">' + html + SP.renderFixed(p, ctx) + '</div>';
    SP_initPage(root);
  }

  var drag = null;
  function endDrag() { drag = null; $('#drop-line').hidden = true; var ed = $('#ed'); if (ed) ed.classList.remove('dragging'); $$('.ed-blk.lift').forEach(function (x) { x.classList.remove('lift'); }); }
  function dropIndex(y) {
    var blks = $$('#page-root .ed-blk');
    for (var i = 0; i < blks.length; i++) {
      var r = blks[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return blks.length;
  }
  function showDropLine(idx) {
    var line = $('#drop-line'), frame = $('#frame');
    var blks = $$('#page-root .ed-blk'), fr = frame.getBoundingClientRect(), top;
    if (!blks.length) top = 40;
    else if (idx < blks.length) top = blks[idx].getBoundingClientRect().top - fr.top;
    else top = blks[blks.length - 1].getBoundingClientRect().bottom - fr.top;
    line.style.top = (top - 2) + 'px';
    line.hidden = false;
  }

  function bindCanvas() {
    var canvas = $('#canvas');
    canvas.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a && a.closest('#page-root')) e.preventDefault();
      var stage = e.target.closest('[data-stage-for]');
      if (stage) { select(stage.getAttribute('data-stage-for')); if (narrow()) setDrawer('insp'); return; }
      var blk = e.target.closest('.ed-blk');
      if (!blk) {
        if (e.target === canvas || e.target.id === 'frame') { select(null); }
        return;
      }
      var id = blk.getAttribute('data-id');
      var act = e.target.closest('.ed-bar button');
      if (act) return blockAction(id, act.getAttribute('data-a'));
      if (S.sel !== id) select(id);
      if (narrow() && !e.target.closest('.sp-order')) setDrawer('insp');
    });
    canvas.addEventListener('dragstart', function (e) {
      var g = e.target.closest && e.target.closest('.ed-grip');
      if (!g) return;
      var blk = g.closest('.ed-blk');
      drag = { move: blk.getAttribute('data-id') };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', drag.move);
      try { e.dataTransfer.setDragImage(blk, 40, 20); } catch (x) {}
      blk.classList.add('lift');
      $('#ed').classList.add('dragging');
    });
    canvas.addEventListener('dragend', endDrag);
    canvas.addEventListener('dragover', function (e) {
      if (!drag) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = drag.move ? 'move' : 'copy';
      showDropLine(dropIndex(e.clientY));
    });
    canvas.addEventListener('dragleave', function (e) { if (!canvas.contains(e.relatedTarget)) $('#drop-line').hidden = true; });
    canvas.addEventListener('drop', function (e) {
      if (!drag) return;
      e.preventDefault();
      var idx = dropIndex(e.clientY), d = drag;
      endDrag();
      if (d.type) return addBlock(d.type, idx);
      var from = S.page.blocks.findIndex(function (b) { return b.id === d.move; });
      if (from < 0) return;
      if (from < idx) idx--;
      if (from === idx) return;
      mutate(null, function () { var b = S.page.blocks.splice(from, 1)[0]; S.page.blocks.splice(idx, 0, b); S.sel = b.id; }, { insp: true });
    });
  }

  function select(id) {
    S.sel = id;
    $$('#page-root .ed-blk').forEach(function (x) { x.classList.toggle('sel', x.getAttribute('data-id') === id); });
    renderInspector();
  }

  function blockAction(id, act) {
    var bl = S.page.blocks, i = bl.findIndex(function (b) { return b.id === id; });
    if (i < 0) return;
    if (act === 'up' && i > 0) mutate(null, function () { bl.splice(i - 1, 0, bl.splice(i, 1)[0]); S.sel = id; }, { insp: true });
    if (act === 'down' && i < bl.length - 1) mutate(null, function () { bl.splice(i + 1, 0, bl.splice(i, 1)[0]); S.sel = id; }, { insp: true });
    if (act === 'up' || act === 'down') scrollToBlock(id);
    if (act === 'dup') {
      var c = SP.clone(bl[i]); c.id = SP.uid();
      mutate(null, function () { bl.splice(i + 1, 0, c); S.sel = c.id; }, { insp: true });
      scrollToBlock(c.id);
    }
    if (act === 'del') {
      var name = SP.blocks[bl[i].type].label;
      mutate(null, function () { bl.splice(i, 1); if (S.sel === id) S.sel = null; }, { insp: true });
      toast(name + ' deleted', { label: 'Undo', fn: undo });
    }
  }

  /* ---------- inspector (right) ---------- */
  function renderInspector() {
    var insp = $('#insp');
    if (!insp) return;
    var lab = $('#tab-edit-label');
    insp.innerHTML = '';
    var b = S.sel && S.page.blocks.find(function (x) { return x.id === S.sel; });
    if (lab) lab.textContent = b ? 'Edit ' + SP.blocks[b.type].label.toLowerCase() : 'Page settings';
    if (b) {
      var def = SP.blocks[b.type];
      var head = h('div', { class: 'panel-head' });
      head.appendChild(h('button', { type: 'button', class: 'link-btn', onclick: function () { select(null); } }, icon('back') + 'Page settings'));
      head.appendChild(h('h2', {}, '<span class="tile">' + icon(def.icon) + '</span>' + esc(def.label)));
      insp.appendChild(head);
      var body = h('div', { class: 'form' });
      buildFields(def.fields, b.props, body, b.id, b.props);
      insp.appendChild(body);
      if (b.type === 'order') { var ws = h('div', { class: 'form-sec', style: 'margin-top:24px' }); ws.appendChild(orderPreview()); insp.appendChild(ws); }
      var foot = h('div', { class: 'panel-foot' });
      foot.appendChild(h('button', { type: 'button', class: 'btn sm', onclick: function () { blockAction(b.id, 'dup'); } }, icon('copy') + 'Duplicate section'));
      foot.appendChild(h('button', { type: 'button', class: 'btn sm danger', onclick: function () { blockAction(b.id, 'del'); } }, icon('trash') + 'Delete section'));
      insp.appendChild(foot);
    } else {
      renderPageSettings(insp);
    }
  }

  function buildFields(fields, obj, parent, keyBase, blockProps) {
    fields.forEach(function (f) {
      if (f.showIf && !f.showIf(blockProps)) return;
      parent.appendChild(fieldEl(f, obj, keyBase + '.' + f.key, blockProps));
    });
  }

  function fieldEl(f, obj, key, blockProps) {
    var id = 'fld-' + key.replace(/[^\w-]/g, '-');
    var wrap = h('div', { class: 'fld' + (f.half ? ' half' : '') + ' t-' + f.type });
    var label = function () { wrap.appendChild(h('label', { for: id, class: 'fld-label' }, esc(f.label))); };
    var hint = function () { if (f.hint) wrap.appendChild(h('p', { class: 'fld-hint' }, esc(f.hint))); };
    var set = function (v, opts) { mutate(key, function () { obj[f.key] = v; }, opts); };
    var rerenderIfDepends = function () { return fieldsDependOn(blockProps); };

    switch (f.type) {
      case 'text': case 'number': case 'datetime': {
        label();
        var inp = h('input', { id: id, type: f.type === 'datetime' ? 'datetime-local' : (f.type === 'number' ? 'number' : 'text') });
        if (f.type === 'number') { inp.min = '0'; inp.step = 'any'; inp.inputMode = 'decimal'; }
        inp.value = obj[f.key] == null ? '' : obj[f.key];
        inp.addEventListener('input', function () {
          set(f.type === 'number' ? (parseFloat(inp.value) || 0) : inp.value);
          if (f.titleOf) f.titleOf(inp.value);
        });
        wrap.appendChild(inp); hint(); break;
      }
      case 'textarea': {
        label();
        var ta = h('textarea', { id: id, rows: f.rows || 3 });
        ta.value = obj[f.key] || '';
        ta.addEventListener('input', function () { set(ta.value); });
        wrap.appendChild(ta); hint(); break;
      }
      case 'select': {
        label();
        var sel = h('select', { id: id });
        f.options.forEach(function (o) { var op = h('option', { value: o[0] }, esc(o[1])); if (String(obj[f.key]) === String(o[0])) op.selected = true; sel.appendChild(op); });
        sel.addEventListener('change', function () { set(sel.value); });
        wrap.appendChild(sel); hint(); break;
      }
      case 'segment': {
        wrap.appendChild(h('span', { class: 'fld-label', id: id }, esc(f.label)));
        var seg = h('div', { class: 'seg seg-full', role: 'radiogroup', 'aria-labelledby': id });
        f.options.forEach(function (o) {
          var on = String(obj[f.key]) === String(o[0]);
          var b = h('button', { type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', class: on ? 'on' : '' }, esc(o[1]));
          b.addEventListener('click', function () {
            $$('button', seg).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
            set(o[0], { insp: rerenderIfDepends() });
          });
          seg.appendChild(b);
        });
        wrap.appendChild(seg); hint(); break;
      }
      case 'toggle': {
        var lb = h('label', { class: 'switch', for: id });
        var cb = h('input', { type: 'checkbox', id: id });
        cb.checked = !!obj[f.key];
        cb.addEventListener('change', function () { set(cb.checked, { insp: !!f.rerender }); });
        lb.appendChild(cb); lb.appendChild(h('span', { class: 'knob', 'aria-hidden': 'true' }));
        lb.appendChild(h('span', {}, esc(f.label)));
        wrap.appendChild(lb); hint(); break;
      }
      case 'image': {
        wrap.appendChild(h('span', { class: 'fld-label' }, esc(f.label)));
        var box = h('div', { class: 'imgfld' });
        var file = h('input', { type: 'file', accept: 'image/*', id: id, hidden: true });
        var draw = function () {
          box.innerHTML = '';
          if (obj[f.key]) {
            box.appendChild(h('img', { src: obj[f.key], alt: '' }));
            var acts = h('div', { class: 'imgfld-acts' });
            acts.appendChild(h('label', { class: 'btn sm', for: id }, icon('upload') + 'Change'));
            acts.appendChild(h('button', { type: 'button', class: 'btn sm danger', onclick: function () { set(''); draw(); } }, icon('trash') + 'Remove'));
            box.appendChild(acts);
          } else {
            box.appendChild(h('label', { class: 'imgdrop', for: id }, icon('upload') + '<b>Upload photo</b><small>or drop a picture here</small>'));
          }
          box.appendChild(file);
        };
        var take = function (fl) {
          if (!fl) return;
          box.classList.add('busy');
          readImage(fl).then(function (data) { set(data); draw(); }).catch(function () { toast('That file is not a photo we can use. Try a JPG or PNG.'); }).then(function () { box.classList.remove('busy'); });
        };
        file.addEventListener('change', function () { take(file.files[0]); file.value = ''; });
        box.addEventListener('dragover', function (e) { e.preventDefault(); box.classList.add('over'); });
        box.addEventListener('dragleave', function () { box.classList.remove('over'); });
        box.addEventListener('drop', function (e) { e.preventDefault(); box.classList.remove('over'); take(e.dataTransfer.files[0]); });
        draw();
        wrap.appendChild(box);
        var url = h('details', { class: 'imgurl' }, '<summary>Use a web link instead</summary>');
        var ui = h('input', { type: 'url', placeholder: 'https://…', 'aria-label': 'Photo web link', id: id + '-url' });
        if (/^https?:/.test(obj[f.key] || '')) ui.value = obj[f.key];
        ui.addEventListener('change', function () { set(ui.value.trim()); draw(); });
        url.appendChild(ui);
        wrap.appendChild(url);
        hint(); break;
      }
      case 'list': {
        wrap.appendChild(h('span', { class: 'fld-label' }, esc(f.label)));
        hint();
        var arr = obj[f.key] = obj[f.key] || [];
        var list = h('div', { class: 'list' });
        arr.forEach(function (item, i) {
          var card = h('details', { class: 'list-item' });
          var title = f.titleKey ? (item[f.titleKey] || f.itemLabel) : (f.itemLabel + ' ' + (i + 1));
          var sum = h('summary', {}, '<span class="li-t">' + esc(String(title).replace(/\*\*/g, '').slice(0, 40)) + '</span>');
          var tools = h('span', { class: 'li-tools' });
          var mk = function (ic, lab, dis, fn) {
            var b = h('button', { type: 'button', title: lab, 'aria-label': lab, disabled: dis }, icon(ic));
            b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); });
            tools.appendChild(b);
          };
          mk('up', 'Move up', i === 0, function () { mutate(null, function () { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); }, { insp: true }); });
          mk('down', 'Move down', i === arr.length - 1, function () { mutate(null, function () { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); }, { insp: true }); });
          mk('copy', 'Duplicate', false, function () { mutate(null, function () { arr.splice(i + 1, 0, SP.clone(item)); }, { insp: true }); });
          mk('trash', 'Remove', false, function () { mutate(null, function () { arr.splice(i, 1); }, { insp: true }); });
          sum.appendChild(tools);
          card.appendChild(sum);
          var inner = h('div', { class: 'list-body' });
          f.fields.forEach(function (sf) {
            var sfc = Object.assign({}, sf);
            if (f.titleKey === sf.key) {
              sfc.titleOf = function (v) { var t = $('.li-t', sum); if (t) t.textContent = String(v || f.itemLabel).replace(/\*\*/g, '').slice(0, 40); };
            }
            inner.appendChild(fieldEl(sfc, item, key + '.' + i + '.' + sf.key, blockProps));
          });
          card.appendChild(inner);
          if (openItems[key + '.' + i]) card.open = true;
          card.addEventListener('toggle', function () { openItems[key + '.' + i] = card.open; });
          list.appendChild(card);
        });
        wrap.appendChild(list);
        var add = h('button', { type: 'button', class: 'btn add' }, icon('plus') + esc(f.addLabel || 'Add'));
        add.addEventListener('click', function () {
          mutate(null, function () { arr.push(f.newItem ? f.newItem() : {}); }, { insp: true });
          openItems[key + '.' + (arr.length - 1)] = true;
          renderInspector();
          var last = $$('#insp .list-item');
          if (last.length) last[last.length - 1].scrollIntoView({ block: 'nearest' });
        });
        wrap.appendChild(add);
        break;
      }
    }
    return wrap;
  }
  var openItems = {};
  function fieldsDependOn(p) {
    var b = S.page.blocks.find(function (x) { return x.props === p; });
    return !!(b && SP.blocks[b.type].fields.some(function (f) { return f.showIf; }));
  }

  /* ---------- page settings (right, nothing selected) ---------- */
  function renderPageSettings(insp) {
    var p = S.page, t = p.theme, s = p.settings, F = SP.F;
    insp.appendChild(h('div', { class: 'panel-head' }, '<h2>Page settings</h2><p>Tap any section on the page to edit its words, photos and prices.</p>'));
    var form = h('div', { class: 'form' });

    /* colour presets */
    var sec = function (title) { var d = h('div', { class: 'form-sec' }); d.appendChild(h('h3', {}, esc(title))); form.appendChild(d); return d; };
    var biz = sec('Orders');
    var lk = sec('Layout style');
    var looks = h('div', { class: 'fontpick lookpick', role: 'radiogroup', 'aria-label': 'Layout style' });
    Object.keys(SP.looks).forEach(function (k) {
      var lo = SP.looks[k], on = (t.look || 'classic') === k;
      var b = h('button', { type: 'button', class: on ? 'on' : '', role: 'radio', 'aria-checked': on ? 'true' : 'false', title: lo.hint }, '<b>' + esc(lo.label) + '</b><span>' + esc(lo.hint) + '</span>');
      b.addEventListener('click', function () { mutate(null, function () { t.look = k; }, { insp: true }); });
      looks.appendChild(b);
    });
    lk.appendChild(looks);
    var look = sec('Colours');
    var sw = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Colour theme' });
    Object.keys(SP.themes).forEach(function (k) {
      var th = SP.themes[k], on = t.preset === k;
      var b = h('button', { type: 'button', class: 'swatch' + (on ? ' on' : ''), role: 'radio', 'aria-checked': on ? 'true' : 'false', title: th.label },
        '<span class="sw" style="background:' + th.bg + '"><i style="background:' + th.primary + '"></i><i style="background:' + th.accent + '"></i></span>' + esc(th.label));
      b.addEventListener('click', function () {
        mutate(null, function () { Object.assign(t, { preset: k, primary: th.primary, accent: th.accent, bg: th.bg, text: th.text }); }, { insp: true });
      });
      sw.appendChild(b);
    });
    look.appendChild(sw);
    var colors = h('div', { class: 'colors' });
    [['primary', 'Brand'], ['accent', 'Buttons'], ['bg', 'Background'], ['text', 'Text']].forEach(function (c) {
      var lid = 'clr-' + c[0];
      var lb = h('label', { class: 'color', for: lid });
      var inp = h('input', { type: 'color', id: lid, value: t[c[0]] });
      inp.addEventListener('input', function () { mutate('theme.' + c[0], function () { t[c[0]] = inp.value; t.preset = 'custom'; }); $$('.swatch').forEach(function (x) { x.classList.remove('on'); }); });
      lb.appendChild(inp); lb.appendChild(h('span', {}, esc(c[1])));
      colors.appendChild(lb);
    });
    look.appendChild(colors);

    var typo = sec('Letters & shape');
    var fonts = h('div', { class: 'fontpick', role: 'radiogroup', 'aria-label': 'Font style' });
    Object.keys(SP.fonts).forEach(function (k) {
      var fo = SP.fonts[k], on = t.font === k;
      var b = h('button', { type: 'button', class: on ? 'on' : '', role: 'radio', 'aria-checked': on ? 'true' : 'false' }, '<b style="font-family:' + esc(fo.h) + '">Aa</b><span>' + esc(fo.label) + '</span>');
      b.addEventListener('click', function () { mutate(null, function () { t.font = k; }, { insp: true }); });
      fonts.appendChild(b);
    });
    typo.appendChild(fonts);
    typo.appendChild(fieldEl(F.seg('corners', 'Corners', Object.keys(SP.corners).map(function (k) { return [k, SP.corners[k].label]; })), t, 'theme.corners', t));

    biz.appendChild(fieldEl(F.text('businessName', 'Business name', { hint: 'Shown in the WhatsApp order message.' }), s, 'settings.businessName', s));
    biz.appendChild(fieldEl(F.text('whatsapp', 'WhatsApp number for orders', { hint: 'E.g. 012-345 6789. Orders from your page go to this number.' }), s, 'settings.whatsapp', s));
    biz.appendChild(orderPreview());
    biz.appendChild(fieldEl(F.seg('lang', 'Page language', [['ms', 'Bahasa Melayu'], ['en', 'English']], { hint: 'For buttons and labels like "Jumlah" or "Total".' }), s, 'settings.lang', s));

    var extra = sec('Helpful extras');
    extra.appendChild(fieldEl(F.toggle('waFloat', 'Floating WhatsApp chat button'), s, 'settings.waFloat', s));
    extra.appendChild(fieldEl(F.toggle('sticky', 'Sticky order button at the bottom', { rerender: true, hint: 'Stays on screen while visitors scroll. Great on phones.' }), s, 'settings.sticky', s));
    if (s.sticky) extra.appendChild(fieldEl(F.text('stickyText', 'Sticky button text'), s, 'settings.stickyText', s));

    var seo = sec('Sharing & ads');
    seo.appendChild(fieldEl(F.text('seoTitle', 'Title when shared', { hint: 'Shown on Google and when the link is shared on WhatsApp or Facebook. Leave empty to use your headline.' }), s, 'settings.seoTitle', s));
    seo.appendChild(fieldEl(F.area('seoDesc', 'Description when shared', { rows: 2 }), s, 'settings.seoDesc', s));
    seo.appendChild(fieldEl(F.text('pixelId', 'Facebook Pixel ID (optional)', { hint: 'Numbers only. Tracks visits and WhatsApp orders for your Facebook ads.' }), s, 'settings.pixelId', s));

    insp.appendChild(form);
  }

  /* ---------- signature: the WhatsApp message a customer will send ---------- */
  function orderMessage(p) {
    var s = p.settings, L = SP.L[s.lang] || SP.L.ms;
    var ob = p.blocks.find(function (b) { return b.type === 'order'; });
    if (!ob || !ob.props.items.length) return null;
    var o = ob.props, it = o.items[0], ship = (o.shipping || [])[0];
    var sub = Number(it.price) || 0, fee = ship ? Number(ship.fee) || 0 : 0;
    if (Number(o.freeShipMin) > 0 && sub >= Number(o.freeShipMin)) fee = 0;
    var lines = [L.orderIntro + (s.businessName ? ' (' + s.businessName + ')' : '') + ':', '', '• 1 x ' + it.name + ' = ' + SP.money(sub)];
    if (ship) lines.push((o.shipLabel || 'Penghantaran') + ': ' + ship.label + ' (' + (fee ? SP.money(fee) : L.free) + ')');
    lines.push('*' + L.total + ': ' + SP.money(sub + fee) + '*', '', L.name + ': …', L.phone + ': …');
    if (o.askAddress) lines.push(L.address + ': …');
    return lines.join('\n');
  }
  function orderPreview() {
    var box = h('div', { class: 'wa-prev', 'data-wa-prev': '' });
    fillPreview(box);
    return box;
  }
  function fillPreview(box) {
    var p = S.page, msg = orderMessage(p), wa = SP.waNumber(p.settings.whatsapp);
    box.innerHTML = '';
    if (!msg) { box.innerHTML = '<p class="fld-hint">Add an order form section and customers can order straight to your WhatsApp.</p>'; return; }
    var hd = h('div', { class: 'wa-prev-h' }, '<b>What customers send you</b>' + (wa ? '<span class="wa-to num">to ' + esc(fmtPhone(wa)) + '</span>' : '<span class="pill warn">No WhatsApp number</span>'));
    box.appendChild(hd);
    var pre = h('pre', { class: 'wa-msg' }); pre.textContent = msg; box.appendChild(pre);
    box.appendChild(h('p', { class: 'fld-hint' }, 'Example with one ' + esc(p.blocks.find(function (b) { return b.type === 'order'; }).props.items[0].name) + '. Each customer’s own choices fill in when they order.'));
  }
  function refreshPreviews() { $$('[data-wa-prev]').forEach(fillPreview); }

  /* ---------- status in the top bar: can this page take orders? ---------- */
  function updateStatus() {
    var el = $('#status-pill');
    if (!el || !S.page) return;
    var f = pageFacts(S.page);
    if (f.status.cls === 'warn') {
      el.innerHTML = '<button type="button" class="pill warn" title="Add your WhatsApp number">' + f.status.text + '</button>';
      $('button', el).addEventListener('click', function () {
        select(null); setDrawer('insp');
        var w = $('#fld-settings-whatsapp'); if (w) { w.focus(); w.scrollIntoView({ block: 'center' }); }
      });
    } else el.innerHTML = '<span class="pill ' + f.status.cls + '">' + f.status.text + '</span>';
  }

  /* ================= PREVIEW ================= */
  /* Preview shows the exact file that Publish downloads, so what you see is what buyers get. */
  function openPreview() {
    saveNow();
    var dev = S.device;
    var ov = h('div', { class: 'overlay preview', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Preview' });
    ov.innerHTML = '<div class="ov-bar"><h2>Preview</h2><span class="ov-note">Exactly what buyers see. The order form and buttons work.</span>' +
      '<div class="seg"><button type="button" data-dev="desktop">' + icon('desktop') + '<span>Computer</span></button><button type="button" data-dev="mobile">' + icon('mobile') + '<span>Phone</span></button></div>' +
      '<button type="button" class="btn primary" data-close>Back to editing</button></div>' +
      '<div class="ov-body"><div class="pv-frame" id="pv-frame"></div></div>';
    document.body.appendChild(ov);
    var frame = h('iframe', { title: 'Preview of ' + S.page.name, sandbox: 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox' });
    frame.srcdoc = SP.exportHTML(S.page, { preview: true });
    $('#pv-frame', ov).appendChild(frame);
    var setDev = function (d) {
      dev = d;
      $('#pv-frame', ov).classList.toggle('mobile', d === 'mobile');
      $$('.seg button', ov).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-dev') === d); });
    };
    setDev(narrow() ? 'mobile' : dev);
    $$('.seg button', ov).forEach(function (b) { b.addEventListener('click', function () { setDev(b.getAttribute('data-dev')); }); });
    var close = function () { ov.remove(); document.removeEventListener('keydown', esc1); };
    var esc1 = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc1);
    $('[data-close]', ov).addEventListener('click', close);
    $('[data-close]', ov).focus();
  }

  /* ================= PUBLISH ================= */
  function openPublish() {
    saveNow();
    var p = S.page, s = p.settings;
    var warn = [];
    if (!SP.waNumber(s.whatsapp) && p.blocks.some(function (b) { return b.type === 'order'; })) warn.push('Add your <b>WhatsApp number</b> in Page settings, or orders will have nowhere to go.');
    if (p.blocks.some(function (b) { return b.type === 'hero' && !b.props.image; })) warn.push('Your headline has no photo yet. Pages with a real product photo sell better.');
    var file = SP.slug(p.name) + '.html';
    var ov = h('div', { class: 'overlay modal-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pub-title' });
    ov.innerHTML = '<div class="modal">' +
      '<div class="modal-head"><h2 id="pub-title">Put your page online</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon('close') + '</button></div>' +
      (warn.length ? '<div class="notice" role="note">' + warn.map(function (w) { return '<p>' + w + '</p>'; }).join('') + '</div>' : '') +
      '<ol class="pub-steps">' +
      '<li><b>Download your page.</b> It is one file, <code>' + esc(file) + '</code>, with everything inside.<div class="pub-acts"><button type="button" class="btn primary" id="pub-dl">' + icon('download') + 'Download page</button><button type="button" class="btn" id="pub-copy">' + icon('copy') + 'Copy HTML code</button></div></li>' +
      '<li><b>Upload it to free hosting.</b> The easiest: open <span class="url">app.netlify.com/drop</span> and drag the file in. You get a link in seconds.</li>' +
      '<li><b>Share the link</b> in your WhatsApp status, Facebook, TikTok bio and ads.</li></ol>' +
      '<p class="fine">Already have a website or cPanel? Upload the file there and rename it to <code>index.html</code>. Every time you change your page, download and upload it again.</p>' +
      '</div>';
    document.body.appendChild(ov);
    var close = function () { ov.remove(); };
    $('[data-close]', ov).addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    $('#pub-dl', ov).addEventListener('click', function () {
      var ok = SP.download(file, SP.exportHTML(S.page));
      toast(ok ? 'Downloaded ' + file : 'Download is blocked here. Use Copy HTML code instead.');
    });
    $('#pub-copy', ov).addEventListener('click', function () { copyText(SP.exportHTML(S.page), 'HTML copied. Paste it into a file called index.html.'); });
    $('#pub-dl', ov).focus();
  }

  /* ---------- keyboard shortcuts ---------- */
  document.addEventListener('keydown', function (e) {
    if (!S.page || document.querySelector('.overlay')) return;
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    var mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); }
    else if (e.key === 'Escape' && !typing) { select(null); setDrawer(null); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && S.sel) { e.preventDefault(); blockAction(S.sel, 'del'); }
  });

  route();
})(window.SP);
