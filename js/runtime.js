/* Runs on the customer's page (and inside the editor preview).
   IMPORTANT: this function is copied as text into every exported page,
   so it must not use anything outside itself. */
function SP_initPage(root) {
  root = root || document;
  (root.__spTimers || []).forEach(clearInterval);
  root.__spTimers = [];

  var tracking = root === document && window.SP_TRACKING;
  function track(event, extra) {
    if(!tracking) return;
    var body = Object.assign({event:event,slug:tracking.slug},extra||{});
    try { return fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true,signal:AbortSignal.timeout(4000)}).catch(function(){}); } catch(e) {}
  }
  if(tracking){track('visit');root.addEventListener('click',function(e){if(e.target.closest('a.sp-btn'))track('cta');if(e.target.closest('a.sp-wa'))track('whatsapp');});}

  /* ---------- order forms ---------- */
  root.querySelectorAll('.sp-order').forEach(function (form) {
    if (form.__spBound) return;
    form.__spBound = true;
    var cfg = {};
    try { cfg = JSON.parse(form.getAttribute('data-cfg') || '{}'); } catch (e) { return; }
    var L = cfg.labels || {};
    var fmt = function (n) {
      var s = Number(n || 0).toFixed(2);
      if (s.slice(-3) === '.00') s = s.slice(0, -3);
      return (cfg.currency || 'RM') + s;
    };
    var inputs = [].slice.call(form.querySelectorAll('.sp-qty input'));
    var out = function (k) { return form.querySelector('[data-o="' + k + '"]'); };
    var err = form.querySelector('.sp-err');
    var demo = form.querySelector('.sp-demo');

    function state() {
      var q = inputs.map(function (i) { return Math.max(0, Math.min(999, parseInt(i.value, 10) || 0)); });
      var sub = 0;
      (cfg.items || []).forEach(function (it, i) { sub += (q[i] || 0) * Math.max(0, Number(it.price)||0); });
      var r = form.querySelector('.sp-ship input:checked');
      var s = r ? cfg.shipping[+r.value] : null;
      var fee = s ? Math.max(0,Number(s.fee)||0) : 0;
      if (cfg.freeShipMin && sub >= cfg.freeShipMin) fee = 0;
      return { q: q, sub: sub, ship: s, fee: fee, total: Math.round((sub + fee)*100)/100 };
    }
    function update() {
      var st = state();
      var address = form.querySelector('[name="address"]');
      if(address){address.closest('label').hidden=!!(st.ship&&st.ship.pickup);address.required=!!cfg.askAddress&&!(st.ship&&st.ship.pickup);}
      inputs.forEach(function(i,idx){i.value=st.q[idx];});
      inputs.forEach(function (i, idx) { i.closest('.sp-item').classList.toggle('is-on', st.q[idx] > 0); });
      if (out('sub')) out('sub').textContent = fmt(st.sub);
      if (out('ship')) out('ship').textContent = st.ship && st.fee === 0 ? (L.free || 'FREE') : fmt(st.fee);
      if (out('total')) out('total').textContent = fmt(st.total);
    }
    form.addEventListener('click', function (e) {
      var b = e.target.closest('.sp-qty button');
      if (!b) return;
      var input = b.parentNode.querySelector('input');
      input.value = Math.max(0, Math.min(999, (parseInt(input.value, 10) || 0) + (+b.getAttribute('data-d'))));
      update();
    });
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var st = state();
      var v = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      var fail = function (msg) { err.textContent = msg; err.hidden = false; };
      err.hidden = true;
      if (!st.q.some(function (x) { return x > 0; })) return fail(L.pickItem);
      if (!v('name') || !v('phone')) return fail(L.needName);
      if ((!/^[+()\d\s-]{8,25}$/.test(v('phone')) || !/^\d{8,15}$/.test(v('phone').replace(/\D/g,'')))) return fail(cfg.currency === 'RM' && (L.total === 'Jumlah') ? 'Sila isi nombor telefon yang sah.' : 'Please enter a valid phone number.');
      if (cfg.askSchedule && (!v('date') || !v('time') || !(new Date(v('date')+'T'+v('time')).getTime() > Date.now()))) return fail(L.total === 'Jumlah' ? 'Sila pilih tarikh dan masa akan datang.' : 'Please choose a future date and time.');
      if (cfg.askAddress && !(st.ship && st.ship.pickup) && !v('address')) return fail(L.needAddr);

      var lines = [L.orderIntro + (cfg.page ? ' (' + cfg.page + ')' : '') + ':', ''];
      (cfg.items || []).forEach(function (it, i) {
        if (st.q[i] > 0) lines.push('• ' + st.q[i] + ' x ' + it.name + ' = ' + fmt(st.q[i] * it.price));
      });
      if (st.ship) lines.push(cfg.shipLabel + ': ' + st.ship.label + ' (' + (st.fee ? fmt(st.fee) : L.free) + ')');
      lines.push('*' + L.total + ': ' + fmt(st.total) + '*', '');
      lines.push(L.name + ': ' + v('name'), L.phone + ': ' + v('phone'));
      if (v('variant')) lines.push((L.total === 'Jumlah' ? 'Pilihan' : 'Variant') + ': ' + v('variant'));
      if (v('date')) lines.push((L.total === 'Jumlah' ? 'Tarikh pilihan' : 'Preferred date') + ': ' + v('date') + ' ' + v('time'));
      if (!(st.ship && st.ship.pickup) && v('address')) lines.push(L.address + ': ' + v('address'));
      if (v('note')) lines.push(L.note.replace(/\s*\(.*\)/, '') + ': ' + v('note'));
      var msg = lines.join('\n');

      if (cfg.demo) {
        demo.hidden = false;
        demo.innerHTML = '';
        var h = document.createElement('b');
        h.textContent = cfg.wa ? 'Preview: customers will send this to +' + cfg.wa : 'Add your WhatsApp number in Page settings. Customers will send this message:';
        var pre = document.createElement('pre');
        pre.textContent = msg;
        demo.appendChild(h); demo.appendChild(pre);
        return;
      }
      if (!cfg.wa) return fail(L.noWa);
      track('whatsapp');
      var consent=form.querySelector('[name="consent"]');
      if(cfg.capture && consent && consent.checked){
        var quantities=st.q,shipInput=form.querySelector('.sp-ship input:checked');
        track('enquiry',{id:(window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)),form:cfg.formId,quantities:quantities,shipping:shipInput?+shipInput.value:0,consent:true,customer:{name:v('name'),phone:v('phone'),address:st.ship&&st.ship.pickup?'':v('address'),note:v('note'),variant:v('variant'),date:v('date'),time:v('time')}});
      }
      if (window.fbq) { try { window.fbq('track', 'Lead', { value: st.total, currency: 'MYR' }); } catch (x) {} }
      var waUrl = 'https://wa.me/' + cfg.wa + '?text=' + encodeURIComponent(msg);
      if (window.self !== window.top) window.open(waUrl, '_blank', 'noopener');
      else window.location.href = waUrl;
    });
    update();
  });

  /* ---------- countdown timers ---------- */
  root.querySelectorAll('.sp-countdown').forEach(function (el) {
    var end;
    if (el.getAttribute('data-mode') === 'evergreen') {
      var key = 'spcd-' + el.getAttribute('data-key'), start = 0;
      try { start = +localStorage.getItem(key) || 0; } catch (e) {}
      if (!start) { start = Date.now(); try { localStorage.setItem(key, String(start)); } catch (e) {} }
      end = start + (+el.getAttribute('data-minutes') || 0) * 60000;
    } else {
      end = new Date(el.getAttribute('data-end')).getTime() || 0;
    }
    var put = function (k, n) { var b = el.querySelector('[data-u="' + k + '"]'); if (b) b.textContent = String(n); };
    function tick() {
      var d = Math.max(0, end - Date.now());
      put('d', Math.floor(d / 864e5)); put('h', Math.floor(d / 36e5) % 24);
      put('m', Math.floor(d / 6e4) % 60); put('s', Math.floor(d / 1e3) % 60);
      el.classList.toggle('is-done', d <= 0);
    }
    tick();
    root.__spTimers.push(setInterval(tick, 1000));
  });

  /* ---------- the order bar steps aside while the order form or the footer is on screen ---------- */
  var bar = root === document && document.querySelector('.sp-fixed.has-bar');
  if (bar && window.IntersectionObserver) {
    var seen = new Set();
    var away = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? seen.add(e.target) : seen.delete(e.target); });
      bar.classList.toggle('is-away', seen.size > 0);
    });
    document.querySelectorAll('#order, .sp-b-footer, .sp-band').forEach(function (el) { away.observe(el); });
  }

  /* ---------- entrance motion (live page only) ---------- */
  if (root === document && window.IntersectionObserver && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var sel = '.sp-hero-copy > *, .sp-hero-img, .sp-head > *, .sp-text > *, .sp-points li, .sp-review, .sp-bonus, .sp-faq details, .sp-cd-u, .sp-item, .sp-radio, ' +
      '.sp-offer-main > *, .sp-offer-stub > *, .sp-band, .sp-guarantee > *, .sp-cta > *, .sp-cta-b > *, .sp-countdown > .sp-h2, .sp-footer > *, .sp-figure, .sp-gal-cell, .sp-cust, .sp-sum';
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, sibs = [].filter.call(el.parentNode.children, function (x) { return x.classList.contains('sp-rise'); });
        el.style.transitionDelay = Math.min(sibs.indexOf(el), 6) * 80 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll(sel).forEach(function (el) { el.classList.add('sp-rise'); io.observe(el); });
  }
}
