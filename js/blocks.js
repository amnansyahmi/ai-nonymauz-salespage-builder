/* Block library: what each block looks like, its default content and its edit form.
   To add a new block, add an entry to SP.blocks and (optionally) to SP.libraryGroups. */
(function (SP) {
  'use strict';
  var esc = SP.esc, rich = SP.rich;

  /* ---------- tiny icon set (editor + page) ---------- */
  var I = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    grip: '<path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" stroke-width="3.2"/>',
    desktop: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    hero: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h6M7 16h4"/>',
    text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    gallery: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    video: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 10l5-3v10l-5-3z"/>',
    list: '<path d="M4 7l2 2 3-3M4 16l2 2 3-3M12 8h8M12 17h8"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a1 1 0 0 0 1 .8h9.8a1 1 0 0 0 1-.8L21 7H6"/>',
    tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    quote: '<path d="M7 7h4v4c0 3-1.8 5-4 5.5M14 7h4v4c0 3-1.8 5-4 5.5"/>',
    faq: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9M12 8S10.5 3 7.5 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    megaphone: '<path d="M3 10v4l12 5V5L3 10zM15 8a4 4 0 0 1 0 8M6 15l1 5h3l-1-4"/>',
    spacer: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
    footer: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5z"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    more: '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>'
  };
  SP.icon = function (name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (I[name] || '') + '</svg>';
  };
  var svgCheck = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var svgCross = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  var svgStar = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>';
  var svgPlay = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor" opacity=".9"/><path d="M10 8l6 4-6 4z" fill="#fff"/></svg>';
  SP.svgChat = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.6 9.6 0 0 0-8.3 14.5L2.3 21.8l5.3-1.4A9.6 9.6 0 1 0 12 2.2zm5.4 13.6c-.2.6-1.3 1.2-1.8 1.3-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.7-.1 1.2z"/></svg>';

  /* ---------- render helpers ---------- */
  function img(src, c, cls, alt) {
    if (src) return '<img class="' + cls + '" src="' + esc(src) + '" alt="' + esc(alt || '') + '" loading="lazy">';
    if (c.editor) return '<div class="' + cls + ' sp-ph">' + SP.icon('image') + '<span>Add a photo</span></div>';
    return '';
  }
  function btn(text, link, extra) {
    if (!text) return '';
    return '<a class="sp-btn ' + (extra || '') + '" href="' + esc(link || '#order') + '">' + esc(text) + '</a>';
  }
  function split(h, body) {
    return '<div class="sp-split"><div class="sp-split-h">' + h + '</div><div class="sp-split-b">' + body + '</div></div>';
  }
  function head(h, sub, level) {
    if (!h && !sub) return '';
    var tag = level === 1 ? 'h1' : 'h2';
    return '<div class="sp-head">' + (h ? '<' + tag + ' class="sp-h' + (level || 2) + '">' + rich(h) + '</' + tag + '>' : '') +
      (sub ? '<p class="sp-lead">' + rich(sub) + '</p>' : '') + '</div>';
  }
  /* The product drawn in code (for the Label style when there is no photo yet): a jar of sambal with its label. */
  function jarSVG(c) {
    var dots = '', seed = 7;
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (var i = 0; i < 70; i++) {
      var x = 70 + rnd() * 160, y = 150 + rnd() * 190;
      if (y > 205 && y < 290) continue;
      dots += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + (4 + rnd() * 5).toFixed(1) + '" ry="' + (2 + rnd() * 2.5).toFixed(1) + '" transform="rotate(' + Math.round(rnd() * 180) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" fill="#e9c58f"/>';
    }
    var name = esc(((c.settings && c.settings.businessName) || '').slice(0, 22));
    return '<svg class="sp-jar" viewBox="0 0 300 400" role="img" aria-label="Balang produk (lukisan)">' +
      '<rect x="78" y="40" width="144" height="58" rx="10" fill="#1d1d1b"/><rect x="78" y="86" width="144" height="12" fill="#2f2f2c"/>' +
      '<rect x="56" y="104" width="188" height="262" rx="34" fill="#6e1a10"/>' + dots +
      '<rect x="56" y="104" width="188" height="262" rx="34" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="6"/>' +
      '<rect x="56" y="200" width="188" height="96" style="fill:var(--bg)"/>' +
      '<rect x="56" y="200" width="188" height="8" style="fill:var(--p)"/><rect x="56" y="288" width="188" height="8" style="fill:var(--p)"/>' +
      (name ? '<text x="150" y="246" text-anchor="middle" font-weight="700" font-size="20" style="font-family:var(--fh);fill:var(--tx0)">' + name + '</text>' : '') +
      '<text x="150" y="272" text-anchor="middle" font-size="13" style="font-family:var(--fb);fill:var(--tx0)">250 g</text></svg>';
  }
  /* The motif drawn as the object itself: a wall-mounted split unit (Shape style, no photo yet). */
  function unitSVG() {
    return '<svg class="sp-unit" viewBox="0 0 620 200" role="img" aria-label="Unit aircond dinding (lukisan)">' +
      '<rect x="0" y="0" width="620" height="200" rx="64" fill="#ffffff"/>' +
      '<rect x="70" y="150" width="480" height="16" rx="8" style="fill:var(--tx0)" opacity=".85"/>' +
      '<rect x="70" y="128" width="480" height="6" rx="3" style="fill:var(--tx0)" opacity=".12"/>' +
      '<circle cx="548" cy="58" r="7" fill="#2bb3e8"/></svg>';
  }
  function youtubeId(url) {
    var m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : '';
  }

  /* ---------- field builders for the edit panel ---------- */
  var F = {
    text: function (key, label, o) { return Object.assign({ key: key, label: label, type: 'text' }, o); },
    area: function (key, label, o) { return Object.assign({ key: key, label: label, type: 'textarea' }, o); },
    num: function (key, label, o) { return Object.assign({ key: key, label: label, type: 'number' }, o); },
    img: function (key, label, o) { return Object.assign({ key: key, label: label, type: 'image' }, o); },
    sel: function (key, label, options, o) { return Object.assign({ key: key, label: label, type: 'select', options: options }, o); },
    seg: function (key, label, options, o) { return Object.assign({ key: key, label: label, type: 'segment', options: options }, o); },
    toggle: function (key, label, o) { return Object.assign({ key: key, label: label, type: 'toggle' }, o); },
    date: function (key, label, o) { return Object.assign({ key: key, label: label, type: 'datetime' }, o); },
    list: function (key, label, fields, o) { return Object.assign({ key: key, label: label, type: 'list', fields: fields }, o); }
  };
  SP.F = F;
  var BG = F.seg('bg', 'Section background', [['default', 'Plain'], ['soft', 'Tint'], ['primary', 'Brand'], ['dark', 'Dark']]);
  var BOLD_HINT = 'Wrap words in **double stars** to make them bold.';
  var LINK_HINT = 'Use #order to jump to your order form, or paste any web link.';

  function inDays(d) {
    var t = new Date(Date.now() + d * 864e5);
    t.setHours(23, 59, 0, 0);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()) + 'T23:59';
  }

  SP.blocks = {
    hero: {
      label: 'Headline', icon: 'hero', hint: 'Big opening title',
      defaults: function () {
        return { eyebrow: 'Promosi minggu ini', headline: 'Tulis tajuk utama yang **menarik** di sini', sub: 'Terangkan dalam satu ayat apa yang pelanggan dapat.', image: '', btnText: 'Saya nak order', btnLink: '#order', align: 'left', bg: 'default' };
      },
      fields: [
        F.text('eyebrow', 'Short fact under the button', { hint: 'Optional. A reason to trust you, e.g. "Resepi keluarga sejak 1998".' }),
        F.area('headline', 'Main title', { hint: BOLD_HINT, rows: 3 }),
        F.area('sub', 'Supporting sentence', { rows: 3 }),
        F.img('image', 'Product photo'),
        F.text('btnText', 'Button text', { hint: 'Leave empty to hide the button.' }),
        F.text('btnLink', 'Button goes to', { hint: LINK_HINT }),
        F.seg('align', 'Alignment', [['left', 'Left'], ['center', 'Centre']]),
        BG
      ],
      render: function (p, c) {
        var pic = c.look === 'stage' ? '' : !p.image && c.look === 'label' ? jarSVG(c) : !p.image && c.look === 'unit' ? unitSVG() : img(p.image, c, 'sp-hero-img', p.headline);
        var brand = c.look === 'label' && c.settings && c.settings.businessName ? '<p class="sp-label-brand">' + esc(c.settings.businessName) + '</p>' : '';
        return '<div class="sp-hero sp-al-' + esc(p.align) + (pic ? ' has-pic' : '') + '"><div class="sp-hero-copy">' + brand +
          (c.editor || c.thumb ? '<h2 class="sp-h1">' + rich(p.headline) + '</h2>' : '<h1 class="sp-h1">' + rich(p.headline) + '</h1>') +
          (p.sub ? '<p class="sp-lead">' + rich(p.sub) + '</p>' : '') +
          btn(p.btnText, p.btnLink) +
          (p.eyebrow ? '<p class="sp-fact">' + esc(p.eyebrow) + '</p>' : '') + '</div>' + pic + '</div>';
      }
    },

    text: {
      label: 'Text', icon: 'text', hint: 'Heading and paragraph',
      defaults: function () { return { heading: 'Kisah di sebalik produk ini', body: 'Ceritakan kenapa anda mula, apa masalah yang anda selesaikan, dan kenapa pelanggan boleh percaya anda.\n\nAyat pendek lebih mudah dibaca di telefon.', align: 'left', bg: 'default' }; },
      fields: [F.text('heading', 'Heading'), F.area('body', 'Paragraph', { rows: 7, hint: BOLD_HINT + ' Press Enter for a new line.' }), F.seg('align', 'Alignment', [['left', 'Left'], ['center', 'Centre']]), BG],
      render: function (p) {
        return '<div class="sp-text sp-al-' + esc(p.align) + '">' + (p.heading ? '<h2 class="sp-h2">' + rich(p.heading) + '</h2>' : '') +
          (p.body ? '<p>' + rich(p.body) + '</p>' : '') + '</div>';
      }
    },

    image: {
      label: 'Photo', icon: 'image', hint: 'One big picture',
      defaults: function () { return { image: '', caption: '', size: 'full', bg: 'default' }; },
      fields: [F.img('image', 'Photo'), F.text('caption', 'Caption (optional)'), F.seg('size', 'Width', [['full', 'Full'], ['narrow', 'Narrow']]), BG],
      render: function (p, c) {
        var i = img(p.image, c, 'sp-photo sp-photo-' + esc(p.size), p.caption);
        if (!i) return '';
        return '<figure class="sp-figure">' + i + (p.caption ? '<figcaption>' + esc(p.caption) + '</figcaption>' : '') + '</figure>';
      }
    },

    gallery: {
      label: 'Photo grid', icon: 'gallery', hint: 'Screenshots, product shots',
      defaults: function () { return { heading: 'Testimoni sebenar pelanggan', columns: '2', items: [{ image: '', caption: '' }, { image: '', caption: '' }, { image: '', caption: '' }, { image: '', caption: '' }], bg: 'soft' }; },
      fields: [F.text('heading', 'Heading'), F.seg('columns', 'Photos per row', [['1', '1'], ['2', '2'], ['3', '3']]),
        F.list('items', 'Photos', [F.img('image', 'Photo'), F.text('caption', 'Caption (optional)')], { itemLabel: 'Photo', addLabel: 'Add photo', newItem: function () { return { image: '', caption: '' }; } }), BG],
      render: function (p, c) {
        var cells = (p.items || []).map(function (it) {
          var i = img(it.image, c, 'sp-gal-img', it.caption);
          return i ? '<figure class="sp-gal-cell">' + i + (it.caption ? '<figcaption>' + esc(it.caption) + '</figcaption>' : '') + '</figure>' : '';
        }).join('');
        return head(p.heading) + (cells ? '<div class="sp-gallery" style="--cols:' + esc(p.columns) + '">' + cells + '</div>' : '');
      }
    },

    video: {
      label: 'Video', icon: 'video', hint: 'YouTube video',
      defaults: function () { return { heading: '', url: '', caption: 'Tonton video 2 minit ini', bg: 'default' }; },
      fields: [F.text('heading', 'Heading (optional)'), F.text('url', 'YouTube link', { hint: 'Copy the link from YouTube and paste it here.' }), F.text('caption', 'Caption (optional)'), BG],
      render: function (p, c) {
        var id = youtubeId(p.url), box;
        if (id && !c.editor) {
          box = '<div class="sp-video"><iframe src="https://www.youtube-nocookie.com/embed/' + id + '" title="' + esc(p.caption || 'Video') + '" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>';
        } else if (id || c.editor) {
          box = '<div class="sp-video sp-video-ph">' + svgPlay + '<span>' + (id ? 'Your YouTube video plays here on the live page' : 'Paste a YouTube link in the panel') + '</span></div>';
        } else return '';
        return head(p.heading) + '<figure class="sp-figure">' + box + (p.caption ? '<figcaption>' + esc(p.caption) + '</figcaption>' : '') + '</figure>';
      }
    },

    benefits: {
      label: 'Point list', icon: 'list', hint: 'Benefits or pain points',
      defaults: function () { return { heading: 'Kenapa pelanggan pilih kami', sub: '', style: 'check', items: [{ text: 'Kelebihan pertama produk anda' }, { text: 'Kelebihan kedua' }, { text: 'Kelebihan ketiga' }], bg: 'soft' }; },
      fields: [F.text('heading', 'Heading'), F.area('sub', 'Short intro (optional)', { rows: 2 }),
        F.seg('style', 'Bullet style', [['check', 'Ticks'], ['cross', 'Crosses'], ['number', 'Numbers']], { hint: 'Use crosses to list problems your customer faces.' }),
        F.list('items', 'Points', [F.area('text', 'Point', { rows: 2, hint: BOLD_HINT })], { itemLabel: 'Point', addLabel: 'Add point', newItem: function () { return { text: 'Point baru' }; } }), BG],
      render: function (p) {
        var lis = (p.items || []).map(function (it, i) {
          var mark = p.style === 'number' ? '' : '<span class="sp-mark sp-mark-' + esc(p.style) + '">' + (p.style === 'cross' ? svgCross : svgCheck) + '</span>';
          return '<li>' + mark + '<span>' + rich(it.text) + '</span></li>';
        }).join('');
        var tag = p.style === 'number' ? 'ol' : 'ul';
        return split(head(p.heading, p.sub), '<' + tag + ' class="sp-points sp-points-' + esc(p.style) + '">' + lis + '</' + tag + '>');
      }
    },

    order: {
      label: 'Order form', icon: 'cart', hint: 'Products, prices, checkout',
      defaults: function () {
        return {
          heading: 'Pilih pakej anda', sub: 'Tekan + untuk tambah kuantiti. Jumlah dikira automatik.',
          items: [
            { name: 'Pakej Asas', desc: '1 unit', price: 39, oldPrice: 49, image: '', badge: '' },
            { name: 'Pakej Jimat', desc: '3 unit', price: 99, oldPrice: 147, image: '', badge: 'Paling laris' }
          ],
          shipLabel: 'Penghantaran',
          shipping: [{ label: 'Semenanjung Malaysia', fee: 8 }, { label: 'Sabah & Sarawak', fee: 15 }],
          freeShipMin: 0, askAddress: true, askNote: true,
          btnText: 'Order melalui WhatsApp',
          payNote: 'Selepas tekan butang, WhatsApp akan dibuka dengan maklumat tempahan anda. Kami akan sahkan dan beri maklumat bayaran.',
          bg: 'soft'
        };
      },
      fields: [
        F.text('heading', 'Heading'), F.area('sub', 'Short intro (optional)', { rows: 2 }),
        F.list('items', 'Products & packages', [
          F.text('name', 'Name'), F.text('desc', 'Short description'),
          F.num('price', 'Price (RM)', { half: true }), F.num('oldPrice', 'Old price (RM)', { half: true, hint: 'Shown crossed out. 0 to hide.' }),
          F.text('badge', 'Label (optional)', { hint: 'E.g. "Paling laris" or "Stok terhad".' }), F.img('image', 'Photo')
        ], { itemLabel: 'Product', addLabel: 'Add product', titleKey: 'name', newItem: function () { return { name: 'Produk baru', desc: '', price: 10, oldPrice: 0, image: '', badge: '' }; } }),
        F.text('shipLabel', 'Delivery section title', { hint: 'For services you could call it "Kawasan" instead.' }),
        F.list('shipping', 'Delivery options', [F.text('label', 'Option'), F.num('fee', 'Fee (RM)')], { itemLabel: 'Option', addLabel: 'Add delivery option', titleKey: 'label', hint: 'Remove all options if you do not deliver.', newItem: function () { return { label: 'Ambil sendiri', fee: 0 }; } }),
        F.num('freeShipMin', 'Free delivery when order reaches (RM)', { hint: '0 means no free delivery.' }),
        F.toggle('askAddress', 'Ask for delivery address'), F.toggle('askNote', 'Let customer add a note'),
        F.text('btnText', 'Button text'),
        F.area('payNote', 'Note under the button', { rows: 3 }),
        BG
      ],
      render: function (p, c) {
        var L = SP.L[c.lang] || SP.L.ms, cur = 'RM', bid = c.bid || 'o';
        var items = p.items || [];
        var rows = items.map(function (it, i) {
          var old = Number(it.oldPrice) > Number(it.price) ? '<s>' + SP.money(it.oldPrice, cur) + '</s>' : '';
          var hasImg = !!it.image;
          return '<div class="sp-item' + (hasImg ? '' : ' sp-item-noimg') + '">' +
            (hasImg ? img(it.image, c, 'sp-item-img', it.name) : '') +
            '<div class="sp-item-body"><div class="sp-item-name">' + esc(it.name) + (it.badge ? ' <span class="sp-badge">' + esc(it.badge) + '</span>' : '') + '</div>' +
            (it.desc ? '<div class="sp-item-desc">' + esc(it.desc) + '</div>' : '') +
            '<div class="sp-price"><b>' + SP.money(it.price, cur) + '</b>' + old + '</div></div>' +
            '<div class="sp-qty"><button type="button" data-d="-1" aria-label="Kurang">−</button><input type="number" min="0" max="999" inputmode="numeric" value="' + (i === 0 ? 1 : 0) + '" aria-label="' + esc(it.name) + '"><button type="button" data-d="1" aria-label="Tambah">+</button></div></div>';
        }).join('');
        var ship = (p.shipping || []);
        var shipHtml = ship.length ? '<fieldset class="sp-ship" data-ui><legend>' + esc(p.shipLabel || 'Penghantaran') + '</legend>' + ship.map(function (s, i) {
          return '<label class="sp-radio"><input type="radio" name="ship-' + esc(bid) + '" value="' + i + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(s.label) + '</span><b>' + (Number(s.fee) ? SP.money(s.fee, cur) : L.free) + '</b></label>';
        }).join('') + (Number(p.freeShipMin) > 0 ? '<p class="sp-small">' + L.freeShipFrom + ' ' + SP.money(p.freeShipMin, cur) + '</p>' : '') + '</fieldset>' : '';
        var cfg = {
          items: items.map(function (it) { return { name: it.name, price: Number(it.price) || 0 }; }),
          shipping: ship.map(function (s) { return { label: s.label, fee: Number(s.fee) || 0 }; }),
          shipLabel: p.shipLabel || 'Penghantaran',
          freeShipMin: Number(p.freeShipMin) || 0, askAddress: !!p.askAddress,
          wa: SP.waNumber(c.settings && c.settings.whatsapp), page: (c.settings && c.settings.businessName) || '',
          currency: cur, labels: L, demo: !!(c.editor || c.preview)
        };
        var f = function (name, label, type, req) {
          var id = 'f-' + bid + '-' + name;
          return '<label class="sp-field" for="' + id + '"><span>' + label + '</span>' +
            (type === 'textarea' ? '<textarea id="' + id + '" name="' + name + '" rows="3"' + (req ? ' required' : '') + '></textarea>' :
              '<input id="' + id + '" name="' + name + '" type="' + type + '"' + (type === 'tel' ? ' inputmode="tel" autocomplete="tel"' : ' autocomplete="name"') + (req ? ' required' : '') + '>') + '</label>';
        };
        return split(head(p.heading, p.sub),
          '<form class="sp-order" novalidate data-cfg="' + esc(JSON.stringify(cfg)) + '">' +
          '<div class="sp-items" data-ui>' + rows + '</div>' + shipHtml +
          '<fieldset class="sp-cust"><legend>' + L.customer + '</legend>' + f('name', L.name, 'text', true) + f('phone', L.phone, 'tel', true) +
          (p.askAddress ? f('address', L.address, 'textarea', true) : '') + (p.askNote ? f('note', L.note, 'text') : '') + '</fieldset>' +
          '<div class="sp-sum" data-ui><div><span>' + L.subtotal + '</span><b data-o="sub">RM0</b></div>' +
          (ship.length ? '<div><span>' + esc(p.shipLabel || 'Penghantaran') + '</span><b data-o="ship">RM0</b></div>' : '') +
          '<div class="sp-sum-total"><span>' + L.total + '</span><b data-o="total">RM0</b></div></div>' +
          '<p class="sp-err" role="alert" hidden></p>' +
          '<button type="submit" class="sp-btn sp-btn-wa">' + SP.svgChat + '<span>' + esc(p.btnText || 'Order') + '</span></button>' +
          (p.payNote ? '<p class="sp-small sp-center">' + rich(p.payNote) + '</p>' : '') +
          '<div class="sp-demo" hidden></div></form>');
      }
    },

    pricing: {
      label: 'Price box', icon: 'tag', hint: 'One offer, big price',
      defaults: function () { return { badge: 'Harga pelancaran', title: 'Pakej Lengkap', oldPrice: 129, price: 39, priceNote: 'Sekali bayar sahaja', items: [{ text: 'Perkara pertama yang pelanggan dapat' }, { text: 'Perkara kedua' }, { text: 'Bonus istimewa' }], btnText: 'Saya nak sekarang', btnLink: '#order', note: 'Harga akan naik selepas promosi tamat', bg: 'default' }; },
      fields: [F.text('badge', 'Label on top (optional)'), F.text('title', 'Package name'), F.num('price', 'Price (RM)', { half: true }), F.num('oldPrice', 'Old price (RM)', { half: true }),
        F.text('priceNote', 'Text under the price'),
        F.list('items', 'What is included', [F.text('text', 'Item')], { itemLabel: 'Item', addLabel: 'Add item', titleKey: 'text', newItem: function () { return { text: 'Item baru' }; } }),
        F.text('btnText', 'Button text'), F.text('btnLink', 'Button goes to', { hint: LINK_HINT }), F.text('note', 'Small note (optional)'), BG],
      render: function (p) {
        var save = Number(p.oldPrice) - Number(p.price);
        var meta = [p.badge, save > 0 ? 'Jimat ' + SP.money(save) : '', p.priceNote].filter(Boolean).map(esc).join(' · ');
        return '<div class="sp-offer"><div class="sp-offer-main"><h2 class="sp-h2">' + rich(p.title) + '</h2>' +
          '<ul class="sp-points sp-points-check">' + (p.items || []).map(function (it) { return '<li><span class="sp-mark sp-mark-check">' + svgCheck + '</span><span>' + rich(it.text) + '</span></li>'; }).join('') + '</ul></div>' +
          '<div class="sp-offer-stub"><div class="sp-bigprice"><b>' + SP.money(p.price) + '</b>' + (Number(p.oldPrice) > Number(p.price) ? '<s>' + SP.money(p.oldPrice) + '</s>' : '') + '</div>' +
          (meta ? '<p class="sp-offer-meta">' + meta + '</p>' : '') + btn(p.btnText, p.btnLink) +
          (p.note ? '<p class="sp-small">' + esc(p.note) + '</p>' : '') + '</div></div>';
      }
    },

    bonus: {
      label: 'Bonuses', icon: 'gift', hint: 'Free extras with value',
      defaults: function () { return { heading: 'Bonus **percuma** untuk anda', items: [{ title: 'Bonus pertama', desc: 'Terangkan kenapa bonus ini berguna.', value: 49 }, { title: 'Bonus kedua', desc: '', value: 29 }], note: 'Hanya untuk pembelian minggu ini', bg: 'default' }; },
      fields: [F.text('heading', 'Heading', { hint: BOLD_HINT }),
        F.list('items', 'Bonuses', [F.text('title', 'Bonus name'), F.text('desc', 'Description'), F.num('value', 'Value (RM)', { hint: '0 to hide.' })], { itemLabel: 'Bonus', addLabel: 'Add bonus', titleKey: 'title', newItem: function () { return { title: 'Bonus baru', desc: '', value: 0 }; } }),
        F.text('note', 'Note under the list'), BG],
      render: function (p, c) {
        var L = SP.L[c.lang] || SP.L.ms, sum = 0;
        var cards = (p.items || []).map(function (it, i) {
          sum += Number(it.value) || 0;
          return '<div class="sp-bonus"><div><div class="sp-bonus-t">' + esc(it.title) + '</div>' + (it.desc ? '<div class="sp-item-desc">' + esc(it.desc) + '</div>' : '') + '</div>' +
            (Number(it.value) ? '<div class="sp-bonus-v"><s>' + SP.money(it.value) + '</s></div>' : '') + '</div>';
        }).join('');
        var body = '<div class="sp-bonuses">' + cards +
          (sum ? '<div class="sp-bonus sp-bonus-sum"><div>' + L.worth + ' ' + SP.money(sum) + '</div><div class="sp-bonus-v">' + L.free + '</div></div>' : '') + '</div>' +
          (p.note ? '<p class="sp-small">' + esc(p.note) + '</p>' : '');
        return split(head(p.heading), body);
      }
    },

    testimonials: {
      label: 'Reviews', icon: 'quote', hint: 'Customer quotes with stars',
      defaults: function () { return { heading: 'Apa kata pelanggan', items: [{ name: 'Nama pelanggan', info: 'Bandar', quote: 'Tulis apa yang pelanggan cakap tentang produk anda.', image: '', stars: 5 }, { name: 'Pelanggan kedua', info: 'Bandar', quote: 'Testimoni yang pendek dan spesifik paling meyakinkan.', image: '', stars: 5 }], bg: 'default' }; },
      fields: [F.text('heading', 'Heading'),
        F.list('items', 'Reviews', [F.area('quote', 'What they said', { rows: 3 }), F.text('name', 'Name', { half: true }), F.text('info', 'Town or job', { half: true }),
          F.sel('stars', 'Stars', [['5', '5 stars'], ['4', '4 stars'], ['0', 'No stars']]), F.img('image', 'Their photo (optional)')],
        { itemLabel: 'Review', addLabel: 'Add review', titleKey: 'name', newItem: function () { return { name: 'Nama', info: '', quote: 'Testimoni baru', image: '', stars: 5 }; } }), BG],
      render: function (p) {
        var cards = (p.items || []).map(function (it) {
          var n = Number(it.stars) || 0, stars = '';
          for (var i = 0; i < n; i++) stars += svgStar;
          var av = it.image ? '<img class="sp-av" src="' + esc(it.image) + '" alt="">' : '';
          return '<figure class="sp-review"><blockquote>' + rich(it.quote) + '</blockquote><figcaption>' + av +
            '<span><b>' + esc(it.name) + '</b>' + (it.info ? ', ' + esc(it.info) : '') + '</span>' +
            (stars ? '<span class="sp-stars" role="img" aria-label="' + n + ' / 5">' + stars + '</span>' : '') + '</figcaption></figure>';
        }).join('');
        return head(p.heading) + '<div class="sp-reviews">' + cards + '</div>';
      }
    },

    faq: {
      label: 'Questions', icon: 'faq', hint: 'FAQ that opens on tap',
      defaults: function () { return { heading: 'Soalan lazim', items: [{ q: 'Berapa lama penghantaran?', a: '2-4 hari bekerja untuk Semenanjung, 4-7 hari untuk Sabah & Sarawak.' }, { q: 'Boleh bayar macam mana?', a: 'Online transfer atau DuitNow QR. Maklumat diberi di WhatsApp.' }], bg: 'default' }; },
      fields: [F.text('heading', 'Heading'),
        F.list('items', 'Questions', [F.text('q', 'Question'), F.area('a', 'Answer', { rows: 3 })], { itemLabel: 'Question', addLabel: 'Add question', titleKey: 'q', newItem: function () { return { q: 'Soalan baru?', a: 'Jawapan.' }; } }), BG],
      render: function (p) {
        return split(head(p.heading), '<div class="sp-faq">' + (p.items || []).map(function (it, i) {
          return '<details' + (i === 0 ? ' open' : '') + '><summary>' + esc(it.q) + '</summary><div>' + rich(it.a) + '</div></details>';
        }).join('') + '</div>');
      }
    },

    countdown: {
      label: 'Countdown', icon: 'clock', hint: 'Timer for promo deadline',
      defaults: function () { return { heading: 'Harga promo tamat dalam', mode: 'date', end: inDays(3), minutes: 1440, expired: '', bg: 'dark' }; },
      fields: [F.text('heading', 'Heading'),
        F.seg('mode', 'Timer type', [['date', 'Fixed date'], ['evergreen', 'Per visitor']], { hint: '"Per visitor" starts the timer when each person first opens the page.' }),
        F.date('end', 'Ends on', { showIf: function (p) { return p.mode === 'date'; } }),
        F.num('minutes', 'Minutes per visitor', { showIf: function (p) { return p.mode === 'evergreen'; }, hint: '1440 minutes = 1 day.' }),
        F.text('expired', 'Text when time is up (optional)'), BG],
      render: function (p, c) {
        var L = SP.L[c.lang] || SP.L.ms;
        var u = function (k, l) { return '<div class="sp-cd-u"><b data-u="' + k + '">0</b><span>' + l + '</span></div>'; };
        return '<div class="sp-countdown" data-mode="' + esc(p.mode) + '" data-end="' + esc(p.end) + '" data-minutes="' + esc(p.minutes) + '" data-key="' + esc(c.bid || '') + '">' +
          (p.heading ? '<h2 class="sp-h2">' + esc(p.heading) + '</h2>' : '') +
          '<div class="sp-cd-row" role="timer">' + u('d', L.days) + u('h', L.hours) + u('m', L.mins) + u('s', L.secs) + '</div>' +
          '<div class="sp-cd-done">' + esc(p.expired || L.expired) + '</div></div>';
      }
    },

    guarantee: {
      label: 'Guarantee', icon: 'shield', hint: 'Build trust, remove risk',
      defaults: function () { return { badge: '100%', title: 'Jaminan puas hati', text: 'Jika produk sampai rosak atau tidak seperti yang diterangkan, kami ganti baru atau pulangkan wang anda.', bg: 'default' }; },
      fields: [F.text('badge', 'Badge text', { hint: 'Short, like "100%" or "7 Hari".' }), F.text('title', 'Title'), F.area('text', 'Promise', { rows: 4 }), BG],
      render: function (p) {
        return '<div class="sp-guarantee">' + (p.badge ? '<p class="sp-guarantee-mark">' + esc(p.badge) + '</p>' : '') + '<div class="sp-guarantee-t"><h2 class="sp-h2">' + rich(p.title) + '</h2><p>' + rich(p.text) + '</p></div></div>';
      }
    },

    cta: {
      label: 'Call to action', icon: 'megaphone', hint: 'Reminder with a button',
      defaults: function () { return { heading: 'Jangan tunggu lagi. **Stok terhad!**', text: 'Tekan butang di bawah dan selesaikan tempahan dalam 1 minit.', btnText: 'Order sekarang', btnLink: '#order', bg: 'primary' }; },
      fields: [F.text('heading', 'Heading', { hint: BOLD_HINT }), F.area('text', 'Text', { rows: 3 }), F.text('btnText', 'Button text'), F.text('btnLink', 'Button goes to', { hint: LINK_HINT }), BG],
      render: function (p, c) {
        if ((c.look === 'label' || c.look === 'chapters') && p.btnText && p.btnText.length <= 9) {
          return '<a class="sp-band" href="' + esc(p.btnLink || '#order') + '"><span class="sp-band-s">' + (p.heading ? rich(p.heading) + (p.text ? ' ' : '') : '') + (p.text ? rich(p.text) : '') + '</span>' +
            '<svg class="sp-band-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18L18 6M8 6h10v10" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>' +
            '<span class="sp-band-w" style="--n:' + p.btnText.length + '">' + esc(p.btnText) + '</span></a>';
        }
        return '<div class="sp-cta">' + (p.heading ? '<h2 class="sp-h2">' + rich(p.heading) + '</h2>' : '') + '<div class="sp-cta-b">' + (p.text ? '<p class="sp-lead">' + rich(p.text) + '</p>' : '') + btn(p.btnText, p.btnLink) + '</div></div>';
      }
    },

    spacer: {
      label: 'Space', icon: 'spacer', hint: 'Breathing room',
      defaults: function () { return { size: 'm', line: true, bg: 'default' }; },
      fields: [F.seg('size', 'Height', [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']]), BG],
      render: function (p) { return '<div class="sp-spacer sp-spacer-' + esc(p.size) + '"></div>'; }
    },

    footer: {
      label: 'Footer', icon: 'footer', hint: 'Business details',
      defaults: function () { return { business: 'Nama Perniagaan Anda', reg: 'SSM: 000000000000', contact: 'Hubungi kami di WhatsApp untuk sebarang pertanyaan.', bg: 'dark' }; },
      fields: [F.text('business', 'Business name'), F.text('reg', 'Registration no. (optional)', { hint: 'Showing your SSM number builds trust.' }), F.area('contact', 'Contact or address', { rows: 3 }), BG],
      render: function (p) {
        return '<div class="sp-footer"><p class="sp-footer-name">' + esc(p.business) + '</p><div class="sp-footer-meta">' +
          (p.contact ? '<span>' + rich(p.contact) + '</span>' : '') + (p.reg ? '<span>' + esc(p.reg) + '</span>' : '') +
          '<span>© ' + new Date().getFullYear() + ' ' + esc(p.business) + '</span></div></div>';
      }
    }
  };

  SP.libraryGroups = [
    { label: 'Grab attention', items: ['hero', 'countdown', 'video'] },
    { label: 'Sell', items: ['order', 'pricing', 'bonus', 'guarantee', 'cta'] },
    { label: 'Convince', items: ['benefits', 'testimonials', 'gallery', 'faq'] },
    { label: 'Content', items: ['text', 'image', 'spacer', 'footer'] }
  ];

  /* Fill any missing props with defaults (keeps old saved pages working). */
  SP.normalizeBlock = function (b) {
    var def = SP.blocks[b.type];
    if (!def) return null;
    var d = def.defaults();
    b.id = b.id || SP.uid();
    b.props = Object.assign(d, b.props || {});
    return b;
  };
  SP.makeBlock = function (type, props) {
    return SP.normalizeBlock({ id: SP.uid(), type: type, props: props ? SP.clone(props) : {} });
  };

  SP.renderSection = function (b, ctx) {
    var def = SP.blocks[b.type];
    if (!def) return '';
    var p = b.props;
    var c = Object.assign({}, ctx, { bid: b.id });
    ctx._n = (ctx._n || 0) + 1;
    var inner = def.render(p, c);
    if (!inner && !ctx.editor) return '';
    var anchor = '';
    if (b.type === 'order' && !ctx._orderSeen) { anchor = ' id="order"'; ctx._orderSeen = true; }
    return '<section class="sp-sec sp-bg-' + esc(p.bg || 'default') + ' sp-b-' + b.type + ' sp-n' + ((ctx._n - 1) % 4) + '"' + anchor + '><div class="sp-wrap">' + inner + '</div></section>';
  };

  SP.renderFixed = function (page, ctx) {
    var s = page.settings || {}, L = SP.L[ctx.lang] || SP.L.ms;
    var num = SP.waNumber(s.whatsapp);
    var wa = s.waFloat && (num || ctx.editor) ?
      '<a class="sp-wa" href="https://wa.me/' + esc(num) + '?text=' + encodeURIComponent(L.chat) + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + SP.svgChat + '</a>' : '';
    if (s.sticky && s.stickyText) {
      return '<div class="sp-fixed has-bar"><div class="sp-sticky"><a class="sp-btn" href="' + esc(s.stickyLink || '#order') + '">' + esc(s.stickyText) + '</a>' + wa + '</div></div>';
    }
    return wa ? '<div class="sp-fixed">' + wa + '</div>' : '';
  };

  /* Stage style: the product photo holds one half of the screen while the other half scrolls. */
  SP.stageMedia = function (page, ctx) {
    var hero = page.blocks.find(function (b) { return b.type === 'hero'; });
    var hp = hero ? hero.props : {}, s = page.settings || {};
    var name = String(hp.headline || s.businessName || page.name || '').replace(/\*\*/g, '');
    var fieldName = s.businessName || name;
    var media = hp.image ? '<img src="' + esc(hp.image) + '" alt="' + esc(name) + '">' :
      '<div class="sp-stage-field"><span>' + esc(fieldName) + '</span>' + (ctx.editor ? '<small>Add your product photo in the Headline section</small>' : '') + '</div>';
    var bar = (hp.eyebrow || s.businessName) ? '<div class="sp-stage-bar"><span>' + esc(hp.eyebrow || '') + '</span><span>' + (hp.image ? esc(s.businessName || '') : '') + '</span></div>' : '';
    return '<aside class="sp-stage-media"' + (hero ? ' data-stage-for="' + hero.id + '"' : '') + '>' + media + bar + '</aside>';
  };
  SP.wrapStage = function (page, ctx, sections) {
    return '<div class="sp-stage">' + SP.stageMedia(page, ctx) + '<div class="sp-stage-col">' + sections + '</div></div>';
  };

  SP.renderPage = function (page, ctx) {
    ctx = Object.assign({ lang: (page.settings && page.settings.lang) || 'ms', settings: page.settings, look: page.theme.look || 'classic' }, ctx);
    var body = page.blocks.map(function (b) { return SP.renderSection(b, ctx); }).join('');
    if (ctx.look === 'stage') body = SP.wrapStage(page, ctx, body);
    return body + SP.renderFixed(page, ctx);
  };
})(window.SP);
