/* Core helpers, themes, fonts and page-language strings. Loaded first. */
window.SP = window.SP || {};
(function (SP) {
  'use strict';

  SP.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  /* Plain text with **bold** and line breaks. Safe: escapes first. */
  SP.rich = function (s) {
    return SP.esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  };
  SP.uid = function () { return Math.random().toString(36).slice(2, 10); };
  SP.money = function (n, cur) {
    var s = Number(n || 0).toFixed(2);
    if (s.slice(-3) === '.00') s = s.slice(0, -3);
    return (cur || 'RM') + s;
  };
  SP.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  /* Malaysian numbers: 012-345 6789 -> 60123456789 */
  SP.waNumber = function (raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.charAt(0) === '0') d = '6' + d;
    return d;
  };

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    if (isNaN(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function lum(hex) {
    var c = hexToRgb(hex).map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  /* Pick the text colour (white or near-black) with the higher contrast on this background. */
  SP.onColor = function (hex) {
    var L = lum(hex);
    var withWhite = 1.05 / (L + 0.05), withInk = (L + 0.05) / (lum('#141414') + 0.05);
    return withWhite >= withInk ? '#ffffff' : '#141414';
  };

  /* Colour presets, named after things Malaysian sellers already know. */
  SP.themes = {
    pandan:   { label: 'Pandan',    primary: '#1d6a45', accent: '#1d6a45', bg: '#ffffff', text: '#14201a' },
    kunyit:   { label: 'Kunyit',    primary: '#9c5a06', accent: '#b4231a', bg: '#f4f4f2', text: '#211b14' },
    tehtarik: { label: 'Teh Tarik', primary: '#6b4026', accent: '#2a1d16', bg: '#efebe6', text: '#2a1d16' },
    laut:     { label: 'Laut',      primary: '#0f4f7d', accent: '#0f4f7d', bg: '#ffffff', text: '#0e1b26' },
    ros:      { label: 'Ros',       primary: '#9b2450', accent: '#9b2450', bg: '#fbf7f8', text: '#2a141d' },
    malam:    { label: 'Malam',     primary: '#e3ad48', accent: '#e3ad48', bg: '#111315', text: '#eef0ec' }
  };

  SP.fonts = {
    moden:  { label: 'Modern',   h: "'Schibsted Grotesk', system-ui, sans-serif", b: "'Schibsted Grotesk', system-ui, sans-serif", q: 'Schibsted+Grotesk:wght@400;600;800' },
    tegas:  { label: 'Bold',     h: "'Archivo', system-ui, sans-serif", b: "'Archivo', system-ui, sans-serif", q: 'Archivo:wdth,wght@75..100,400;75..100,600;75..100,800' },
    elegan: { label: 'Elegant',  h: "'Fraunces', Georgia, serif", b: "'Figtree', system-ui, sans-serif", q: 'Fraunces:opsz,wght@9..144,600;9..144,700&family=Figtree:wght@400;600' },
    mesra:  { label: 'Friendly', h: "'Gabarito', system-ui, sans-serif", b: "'Gabarito', system-ui, sans-serif", q: 'Gabarito:wght@400;600;800' }
  };
  SP.fontsURL = function (keys) {
    var qs = keys.map(function (k) { return SP.fonts[k].q; });
    return 'https://fonts.googleapis.com/css2?family=' + qs.join('&family=') + '&display=swap';
  };

  /* Buttons are either square or fully round, never the in-between soft radius. */
  SP.corners = {
    sharp: { label: 'Square',  r: '0px',  rb: '0px' },
    soft:  { label: 'Soft',    r: '6px',  rb: '999px' },
    round: { label: 'Rounded', r: '20px', rb: '999px' }
  };

  SP.defaultTheme = function (preset) {
    var t = SP.themes[preset || 'pandan'];
    return { preset: preset || 'pandan', primary: t.primary, accent: t.accent, bg: t.bg, text: t.text, font: 'moden', corners: 'soft' };
  };

  SP.themeVars = function (t) {
    var f = SP.fonts[t.font] || SP.fonts.moden;
    var c = SP.corners[t.corners] || SP.corners.soft;
    return [
      '--p:' + t.primary, '--a:' + t.accent, '--bg:' + t.bg, '--tx0:' + t.text,
      '--onp:' + SP.onColor(t.primary), '--ona:' + SP.onColor(t.accent),
      '--fh:' + f.h, '--fb:' + f.b, '--r:' + c.r, '--rb:' + c.rb
    ].join(';');
  };

  /* Words that appear on the customer's page. */
  SP.L = {
    ms: {
      days: 'Hari', hours: 'Jam', mins: 'Minit', secs: 'Saat',
      name: 'Nama penuh', phone: 'No. telefon', address: 'Alamat penghantaran', note: 'Nota (pilihan)',
      subtotal: 'Harga barang', total: 'Jumlah', free: 'PERCUMA',
      pickItem: 'Sila pilih sekurang-kurangnya 1 item.', needName: 'Sila isi nama dan no. telefon.',
      needAddr: 'Sila isi alamat penghantaran.', orderIntro: 'Hai! Saya nak buat tempahan',
      customer: 'Maklumat anda', expired: 'Tawaran telah tamat', save: 'Jimat',
      freeShipFrom: 'Penghantaran percuma untuk belian', noWa: 'Penjual belum isi nombor WhatsApp.',
      worth: 'Nilai', chat: 'Hai, saya nak tahu lebih lanjut.'
    },
    en: {
      days: 'Days', hours: 'Hours', mins: 'Mins', secs: 'Secs',
      name: 'Full name', phone: 'Phone number', address: 'Delivery address', note: 'Note (optional)',
      subtotal: 'Items', total: 'Total', free: 'FREE',
      pickItem: 'Please choose at least 1 item.', needName: 'Please fill in your name and phone number.',
      needAddr: 'Please fill in your delivery address.', orderIntro: 'Hi! I would like to order',
      customer: 'Your details', expired: 'This offer has ended', save: 'Save',
      freeShipFrom: 'Free delivery for orders from', noWa: 'The seller has not added a WhatsApp number yet.',
      worth: 'Worth', chat: 'Hi, I would like to know more.'
    }
  };
})(window.SP);
