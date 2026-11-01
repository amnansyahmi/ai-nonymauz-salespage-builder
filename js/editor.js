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
  function fmtDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' });
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
    return '<div class="sp-page ' + (extraClass || '') + (s.sticky && s.stickyText ? ' has-sticky' : '') + '" style="' + esc(SP.themeVars(page.theme)) + '">' + SP.renderPage(page, ctx) + '</div>';
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
  function renderHome() {
    document.title = 'Nonymauz Salespage Builder';
    var pages = SP.store.all();
    app.className = 'v-home';
    app.innerHTML =
      '<div class="home">' +
      '<header class="home-top"><div class="brand">' + logo() + '<span>Nonymauz<small>Salespage Builder</small></span></div>' +
      '<div class="home-actions"><button type="button" class="btn ghost" id="btn-backup">' + icon('download') + 'Backup all</button>' +
      '<label class="btn ghost" for="restore-file">' + icon('upload') + 'Restore</label><input type="file" id="restore-file" accept="application/json,.json" hidden></div></header>' +
      '<section class="home-intro"><h1>Your salespage, ready in <em>10 minutes</em>.</h1>' +
      '<p>Pick a template, change the words, photos and prices, then publish. No coding. Orders come straight to your WhatsApp.</p>' +
      '<ol class="steps"><li><b>1</b>Choose a template</li><li><b>2</b>Click any part to edit it</li><li><b>3</b>Download and put it online</li></ol></section>' +
      '<section class="home-sec"><h2>Start a new page</h2><div class="tpl-grid">' +
      SP.templates.map(function (t) {
        var p = SP.normalizePage(t.build());
        p.blocks = p.blocks.slice(0, 4);
        return '<article class="tpl" data-tpl="' + t.id + '"><div class="thumb" inert aria-hidden="true">' + pageFrame(p, { editor: true, thumb: true }) + '</div>' +
          '<div class="tpl-meta"><b>' + esc(t.name) + '</b><span>' + esc(t.desc) + '</span><button type="button" class="tpl-go">Use this template</button></div></article>';
      }).join('') + '</div></section>' +
      '<section class="home-sec"><h2>My pages <span class="count">' + pages.length + '</span></h2>' +
      (pages.length ? '<div class="pages-grid">' + pages.map(function (pg) {
        var p = SP.normalizePage(SP.clone(pg));
        var full = p.blocks.length;
        p.blocks = p.blocks.slice(0, 3);
        return '<article class="pcard" data-id="' + p.id + '"><div class="thumb" inert aria-hidden="true" data-open>' + pageFrame(p, { editor: true, thumb: true }) + '</div>' +
          '<div class="pcard-meta"><b>' + esc(p.name) + '</b><span>' + full + ' sections · edited ' + fmtDate(pg.updatedAt) + '</span></div>' +
          '<div class="pcard-actions"><a class="btn primary sm" href="#edit-' + p.id + '">Edit</a>' +
          '<button type="button" class="btn ghost sm" data-act="dup">' + icon('copy') + 'Duplicate</button>' +
          '<button type="button" class="btn ghost sm danger" data-act="del">' + icon('trash') + '<span>Delete</span></button></div></article>';
      }).join('') + '</div>' : '<div class="empty-pages">' + icon('file') + '<p>No pages yet. Pick a template above to make your first one.</p></div>') +
      '</section><footer class="home-foot">Pages are saved in this browser. Use <b>Backup all</b> now and then so you never lose your work.</footer></div>';

    $$('.tpl', app).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = SP.createFromTemplate(b.getAttribute('data-tpl'));
        if (!SP.store.put(p)) return toast('Browser storage is full. Delete an old page or use smaller photos.');
        location.hash = 'edit-' + p.id;
      });
    });
    $$('.pcard', app).forEach(function (card) {
      var id = card.getAttribute('data-id');
      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-open]')) { location.hash = 'edit-' + id; return; }
        var b = e.target.closest('button[data-act]');
        if (!b) return;
        if (b.getAttribute('data-act') === 'dup') {
          var p = SP.store.get(id); p.id = SP.uid(); p.name += ' (copy)';
          SP.store.put(p) ? renderHome() : toast('Browser storage is full.');
        } else if (b.classList.contains('confirm')) {
          SP.store.remove(id); toast('Page deleted'); renderHome();
        } else {
          b.classList.add('confirm'); b.querySelector('span').textContent = 'Tap again to delete';
          setTimeout(function () { if (b.isConnected) { b.classList.remove('confirm'); b.querySelector('span').textContent = 'Delete'; } }, 3500);
        }
      });
    });
    $('#btn-backup').addEventListener('click', function () {
      var ok = SP.download('nonymauz-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ app: 'nonymauz', version: 1, pages: SP.store.all() }), 'application/json');
      toast(ok ? 'Backup downloaded' : 'Download is blocked here. Open the builder in a normal browser tab.');
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
        toast('Restored ' + incoming.length + ' page(s)');
        renderHome();
      }).catch(function () { toast('That file is not a Nonymauz backup.'); });
    });
  }

  function logo() {
    return '<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="8" fill="var(--brand)"/><rect x="8" y="8" width="16" height="5" rx="1.5" fill="var(--brand-ink)"/><rect x="8" y="15" width="10" height="3" rx="1.5" fill="var(--brand-ink)" opacity=".7"/><rect x="8" y="20.5" width="16" height="4" rx="2" fill="var(--sun)"/></svg>';
  }

  /* ================= EDITOR ================= */
  function openEditor(page) {
    S.page = page; S.sel = null; S.hist = []; S.fut = []; S.drawer = null;
    document.title = page.name + ' · Nonymauz';
    app.className = 'v-editor';
    app.innerHTML =
      '<div class="ed" id="ed">' +
      '<header class="ed-top">' +
      '<a class="icon-btn" href="#" title="Back to my pages" aria-label="Back to my pages">' + icon('back') + '</a>' +
      '<div class="ed-name"><input id="page-name" value="' + esc(page.name) + '" aria-label="Page name" maxlength="60"><span id="save-state" class="save-state">Saved</span></div>' +
      '<div class="seg ed-device" role="group" aria-label="Preview size">' +
      '<button type="button" data-dev="desktop" class="on" title="Computer view">' + icon('desktop') + '<span>Computer</span></button>' +
      '<button type="button" data-dev="mobile" title="Phone view">' + icon('mobile') + '<span>Phone</span></button></div>' +
      '<div class="ed-actions">' +
      '<button type="button" class="icon-btn" id="btn-undo" title="Undo (Ctrl+Z)" aria-label="Undo">' + icon('undo') + '</button>' +
      '<button type="button" class="icon-btn" id="btn-redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">' + icon('redo') + '</button>' +
      '<button type="button" class="btn ghost" id="btn-preview">' + icon('eye') + '<span>Preview</span></button>' +
      '<button type="button" class="btn primary" id="btn-publish">' + icon('download') + '<span>Publish</span></button></div></header>' +
      '<aside class="ed-lib" id="lib" aria-label="Add a section"></aside>' +
      '<main class="ed-canvas" id="canvas"><div class="ed-frame" id="frame"><div class="drop-line" id="drop-line" hidden></div><div id="page-root"></div></div></main>' +
      '<aside class="ed-insp" id="insp" aria-label="Edit"></aside>' +
      '<nav class="ed-tabs" aria-label="Panels"><button type="button" data-drawer="lib">' + icon('plus') + 'Add section</button>' +
      '<button type="button" data-drawer="insp">' + icon('sliders') + '<span id="tab-edit-label">Page style</span></button></nav>' +
      '<div class="ed-scrim" id="scrim"></div></div>';

    renderLibrary(); renderCanvas(); renderInspector(); updateUndo();

    $('#page-name').addEventListener('input', function (e) {
      mutate('name', function () { S.page.name = e.target.value || 'Untitled page'; }, { canvas: false });
      document.title = S.page.name + ' · Nonymauz';
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
    scheduleSave(); updateUndo();
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
    if (st) { st.textContent = ok ? 'Saved' : 'Not saved: storage full'; st.classList.toggle('err', !ok); }
    if (!ok) toast('Browser storage is full. Use smaller photos or delete old pages.');
  }
  function restore(json) {
    S.page = JSON.parse(json);
    if (S.sel && !S.page.blocks.some(function (b) { return b.id === S.sel; })) S.sel = null;
    $('#page-name').value = S.page.name;
    renderCanvas(); renderInspector(); scheduleSave(); updateUndo();
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
    lib.innerHTML = '<div class="panel-head"><h2>Add a section</h2><p>Drag onto the page, or tap to add.</p></div>' +
      SP.libraryGroups.map(function (g) {
        return '<div class="lib-group"><h3>' + esc(g.label) + '</h3><div class="lib-items">' + g.items.map(function (type) {
          var d = SP.blocks[type];
          return '<button type="button" class="lib-item" draggable="true" data-type="' + type + '">' + icon(d.icon) + '<span><b>' + esc(d.label) + '</b><small>' + esc(d.hint) + '</small></span></button>';
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
    var ctx = { editor: true, lang: s.lang, settings: s };
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
    root.innerHTML = '<div class="sp-page' + (s.sticky && s.stickyText ? ' has-sticky' : '') + '" style="' + esc(SP.themeVars(p.theme)) + '">' + html + SP.renderFixed(p, ctx) + '</div>';
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
    if (lab) lab.textContent = b ? 'Edit ' + SP.blocks[b.type].label.toLowerCase() : 'Page style';
    if (b) {
      var def = SP.blocks[b.type];
      var head = h('div', { class: 'panel-head row' });
      head.appendChild(h('button', { type: 'button', class: 'link-btn', onclick: function () { select(null); } }, icon('back') + 'Page style'));
      head.appendChild(h('h2', {}, icon(def.icon) + esc(def.label)));
      insp.appendChild(head);
      var body = h('div', { class: 'form' });
      buildFields(def.fields, b.props, body, b.id, b.props);
      insp.appendChild(body);
      var foot = h('div', { class: 'panel-foot' });
      foot.appendChild(h('button', { type: 'button', class: 'btn ghost sm', onclick: function () { blockAction(b.id, 'dup'); } }, icon('copy') + 'Duplicate section'));
      foot.appendChild(h('button', { type: 'button', class: 'btn ghost sm danger', onclick: function () { blockAction(b.id, 'del'); } }, icon('trash') + 'Delete section'));
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
            acts.appendChild(h('label', { class: 'btn ghost sm', for: id }, icon('upload') + 'Change'));
            acts.appendChild(h('button', { type: 'button', class: 'btn ghost sm danger', onclick: function () { set(''); draw(); } }, icon('trash') + 'Remove'));
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
          var sum = h('summary', {}, '<span class="li-n">' + (i + 1) + '</span><span class="li-t">' + esc(String(title).replace(/\*\*/g, '').slice(0, 40)) + '</span>');
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
        var add = h('button', { type: 'button', class: 'btn dashed' }, icon('plus') + esc(f.addLabel || 'Add'));
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
    insp.appendChild(h('div', { class: 'panel-head' }, '<h2>' + icon('sliders') + 'Page style</h2><p>Tap any section on the page to edit its words, photos and prices.</p>'));
    var form = h('div', { class: 'form' });

    /* colour presets */
    var sec = function (title) { var d = h('div', { class: 'form-sec' }); d.appendChild(h('h3', {}, esc(title))); form.appendChild(d); return d; };
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

    var biz = sec('Business & orders');
    biz.appendChild(fieldEl(F.text('businessName', 'Business name', { hint: 'Shown in the WhatsApp order message.' }), s, 'settings.businessName', s));
    biz.appendChild(fieldEl(F.text('whatsapp', 'WhatsApp number for orders', { hint: 'E.g. 012-345 6789. Orders from your page go to this number.' }), s, 'settings.whatsapp', s));
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

  /* ================= PREVIEW ================= */
  function openPreview() {
    saveNow();
    var dev = S.device;
    var ov = h('div', { class: 'overlay preview', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Preview' });
    ov.innerHTML = '<div class="ov-bar"><b>Preview</b><span class="ov-note">This is what customers see. Try the order form.</span>' +
      '<div class="seg"><button type="button" data-dev="desktop">' + icon('desktop') + '<span>Computer</span></button><button type="button" data-dev="mobile">' + icon('mobile') + '<span>Phone</span></button></div>' +
      '<button type="button" class="btn primary" data-close>' + icon('close') + 'Back to editing</button></div>' +
      '<div class="ov-body"><div class="pv-frame" id="pv-frame">' + pageFrame(S.page, { preview: true, lang: S.page.settings.lang, settings: S.page.settings }) + '</div></div>';
    document.body.appendChild(ov);
    var setDev = function (d) {
      dev = d;
      $('#pv-frame', ov).classList.toggle('mobile', d === 'mobile');
      $$('.seg button', ov).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-dev') === d); });
    };
    setDev(dev);
    $$('.seg button', ov).forEach(function (b) { b.addEventListener('click', function () { setDev(b.getAttribute('data-dev')); }); });
    var pv = $('#pv-frame', ov);
    SP_initPage(pv);
    pv.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      var tgt = pv.querySelector(a.getAttribute('href') === '#order' ? '#order' : a.getAttribute('href'));
      if (tgt) tgt.scrollIntoView({ behavior: 'smooth' });
    });
    var close = function () { (pv.__spTimers || []).forEach(clearInterval); ov.remove(); document.removeEventListener('keydown', esc1); };
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
    if (!SP.waNumber(s.whatsapp) && p.blocks.some(function (b) { return b.type === 'order'; })) warn.push('Add your <b>WhatsApp number</b> in Page style, or orders will have nowhere to go.');
    if (p.blocks.some(function (b) { return b.type === 'hero' && !b.props.image; })) warn.push('Your headline has no photo yet. Pages with a real product photo sell better.');
    var file = SP.slug(p.name) + '.html';
    var ov = h('div', { class: 'overlay modal-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pub-title' });
    ov.innerHTML = '<div class="modal">' +
      '<div class="modal-head"><h2 id="pub-title">Put your page online</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon('close') + '</button></div>' +
      (warn.length ? '<div class="warn">' + warn.map(function (w) { return '<p>' + w + '</p>'; }).join('') + '</div>' : '') +
      '<ol class="pub-steps">' +
      '<li><b>Download your page.</b> It is one file, <code>' + esc(file) + '</code>, with everything inside.<div class="pub-acts"><button type="button" class="btn primary" id="pub-dl">' + icon('download') + 'Download page</button><button type="button" class="btn ghost" id="pub-copy">' + icon('copy') + 'Copy HTML code</button></div></li>' +
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
