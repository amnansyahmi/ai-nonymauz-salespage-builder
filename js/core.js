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
  SP.onColor = function (hex) {
    var c = hexToRgb(hex).map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return L > 0.42 ? '#141414' : '#ffffff';
  };

  /* Colour presets, named after things Malaysian sellers already know. */
  SP.themes = {
    pandan:   { label: 'Pandan',    primary: '#1f7a4d', accent: '#f0a020', bg: '#ffffff', text: '#18241d' },
    kunyit:   { label: 'Kunyit',    primary: '#b85f00', accent: '#d8412a', bg: '#fffaf1', text: '#2a1f14' },
    tehtarik: { label: 'Teh Tarik', primary: '#6f4428', accent: '#cf7f2a', bg: '#fbf5ee', text: '#2b1d14' },
    laut:     { label: 'Laut',      primary: '#14598a', accent: '#ff7a1a', bg: '#f6fafd', text: '#10212e' },
    ros:      { label: 'Ros',       primary: '#a92c59', accent: '#e8553b', bg: '#fff7f9', text: '#2d1620' },
    malam:    { label: 'Malam',     primary: '#e3ad48', accent: '#e3ad48', bg: '#121518', text: '#eef0ec' }
  };

  SP.fonts = {
    moden:  { label: 'Modern',   h: "'Plus Jakarta Sans', system-ui, sans-serif", b: "'Plus Jakarta Sans', system-ui, sans-serif", q: 'Plus+Jakarta+Sans:wght@400;600;800' },
    tegas:  { label: 'Bold',     h: "'Archivo Black', 'Arial Black', sans-serif", b: "'Archivo', system-ui, sans-serif", q: 'Archivo+Black&family=Archivo:wght@400;600;800' },
    elegan: { label: 'Elegant',  h: "'Fraunces', Georgia, serif", b: "'Figtree', system-ui, sans-serif", q: 'Fraunces:opsz,wght@9..144,700;9..144,800&family=Figtree:wght@400;600;800' },
    mesra:  { label: 'Friendly', h: "'Baloo 2', system-ui, sans-serif", b: "'Nunito', system-ui, sans-serif", q: 'Baloo+2:wght@600;800&family=Nunito:wght@400;700;800' }
  };
  SP.fontsURL = function (keys) {
    var qs = keys.map(function (k) { return SP.fonts[k].q; });
    return 'https://fonts.googleapis.com/css2?family=' + qs.join('&family=') + '&display=swap';
  };

  SP.corners = {
    sharp: { label: 'Sharp',   r: '4px',  rb: '4px' },
    soft:  { label: 'Soft',    r: '14px', rb: '12px' },
    round: { label: 'Rounded', r: '22px', rb: '999px' }
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
