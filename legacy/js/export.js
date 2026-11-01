/* Turns a page into one standalone .html file the seller can upload anywhere. */
(function (SP) {
  'use strict';
  var esc = SP.esc;

  function firstImage(page) {
    for (var i = 0; i < page.blocks.length; i++) {
      var im = page.blocks[i].props.image;
      if (im && /^https?:/.test(im)) return im;
    }
    return '';
  }
  function plain(s) { return String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(); }

  /* opts.preview: the same file, minus ad tracking, for the editor's preview */
  SP.exportHTML = function (page, opts) {
    opts = opts || {};
    var s = page.settings, t = page.theme;
    var hero = page.blocks.find(function (b) { return b.type === 'hero'; });
    var title = s.seoTitle || plain(hero && hero.props.headline) || page.name;
    var desc = s.seoDesc || plain(hero && hero.props.sub) || '';
    var og = firstImage(page);
    var hasSticky = s.sticky && s.stickyText;
    var pixel = !opts.preview && /^\d{5,20}$/.test(String(s.pixelId || '').trim()) ? (
      '<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};' +
      "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];" +
      "s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','" + s.pixelId.trim() + "');fbq('track','PageView');</script>"
    ) : '';

    return '<!doctype html>\n<html lang="' + (s.lang === 'en' ? 'en' : 'ms') + '">\n<head>\n' +
      '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
      '<title>' + esc(title) + '</title>\n' +
      (desc ? '<meta name="description" content="' + esc(desc) + '">\n' : '') +
      '<meta property="og:title" content="' + esc(title) + '">\n' +
      (desc ? '<meta property="og:description" content="' + esc(desc) + '">\n' : '') +
      (og ? '<meta property="og:image" content="' + esc(og) + '">\n' : '') +
      '<meta name="theme-color" content="' + esc(t.primary) + '">\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '<link rel="stylesheet" href="' + SP.fontsURL([t.font]) + '">\n' +
      '<style>html{scroll-behavior:smooth}body{margin:0;background:' + esc(t.bg) + '}\n' + SP.pageCSS + '\n</style>\n' + pixel + '\n</head>\n<body>\n' +
      '<div class="' + SP.pageClass(page) + '" style="' + esc(SP.themeVars(t)) + '">\n' +
      SP.renderPage(page, { editor: false }) +
      '\n</div>\n<script>\n' + SP_initPage.toString() + '\nSP_initPage(document);\n</script>\n' +
      '<!-- Made with Nonymauz Salespage Builder -->\n</body>\n</html>\n';
  };

  SP.slug = function (s) {
    return String(s || 'salespage').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'salespage';
  };

  SP.download = function (filename, text, type) {
    try {
      var blob = new Blob([text], { type: type || 'text/html' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return true;
    } catch (e) { return false; }
  };
})(window.SP);
