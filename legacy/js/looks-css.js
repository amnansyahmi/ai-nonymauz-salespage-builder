/* Layout styles. Each one is a whole composition dealt by taste-skill, not a colour swap.
   label    — "The page is the object": the page is the product's printed jar label.
   chapters — "Colour chapters": every section a full flat colour field, like the chapters of the ebook.
   unit     — "One motif": the outline of a wall-mounted unit runs the whole system (hero shape, buttons, markers, photo masks).
   Appended to SP.pageCSS so the editor and the exported file share it. */
(function (SP) {
  'use strict';
  var label = [
    /* ground and paper: the label is white paper on a dark ground */
    '.look-label .sp-b-hero{overflow:hidden}',
    '.look-label .sp-hero{gap:clamp(32px,5cqi,72px)}',
    '.look-label .sp-hero-copy{background:var(--bg);color:var(--tx0);--tx:var(--tx0);--mut:color-mix(in srgb,var(--tx0) 72%,var(--bg));padding:clamp(28px,5cqi,56px);text-align:center;align-items:center;transform:rotate(-1.5deg);gap:20px}',
    '.look-label .sp-hero-copy .sp-h1{max-width:none;font-size:clamp(2.2rem,6.6cqi,4.8rem);line-height:1;letter-spacing:-.025em;font-weight:700}',
    '.look-label .sp-hero-copy .sp-lead{max-width:30ch}',
    '.look-label .sp-hero-copy .sp-btn{align-self:center}',
    '.look-label .sp-label-brand{font-weight:600;font-size:var(--fm);color:var(--p);padding-bottom:16px;border-bottom:6px dotted var(--p);width:100%}',
    '.look-label .sp-hero-copy .sp-fact{color:var(--tx0);font-weight:500;padding-top:16px;border-top:6px dotted var(--p);width:100%}',
    '.look-label .sp-jar{width:100%;max-width:420px;height:auto;justify-self:center}',
    '.look-label .sp-hero:not(.has-pic) .sp-hero-copy{display:flex;max-width:640px;margin-inline:auto}',
    '@container (min-width:860px){.look-label .sp-hero.has-pic{grid-template-columns:minmax(0,7fr) minmax(0,5fr)}.look-label .sp-hero-copy{aspect-ratio:5/6;justify-content:center}}',
    '.look-label .sp-hero-img{border-radius:0;transform:rotate(2deg)}',
    /* headings and sections set like print */
    '.look-label .sp-h2{font-weight:700;letter-spacing:-.02em}',
    '.look-label .sp-bg-soft{--sbg:var(--alt);--tx:var(--onalt)}',
    /* reviews printed on one card, cut by the section edge */
    '.look-label .sp-b-testimonials{overflow:hidden;padding-bottom:0}',
    '.look-label .sp-b-testimonials .sp-wrap{align-items:center}',
    '.look-label .sp-b-testimonials .sp-head{align-items:center;text-align:center}',
    '.look-label .sp-reviews{display:flex;flex-direction:column;gap:28px;width:min(100%,720px);background:var(--bg);color:var(--tx0);--tx:var(--tx0);--mut:color-mix(in srgb,var(--tx0) 70%,var(--bg));padding:clamp(28px,5cqi,56px) clamp(24px,5cqi,56px) clamp(56px,9cqi,96px);transform:rotate(1deg);text-align:center;margin-bottom:-24px}',
    '.look-label .sp-review figcaption{justify-content:center}',
    /* questions as perforated paper strips */
    '.look-label .sp-faq{gap:0}',
    '.look-label .sp-faq details{border-radius:0;background:var(--alt);color:var(--onalt);border-top:6px dotted var(--sbg)}',
    '.look-label .sp-faq details:first-child{border-top:0}',
    '.look-label .sp-order{border-radius:0}',
    '.look-label .sp-guarantee-mark{color:var(--p)}',

    /* one word is the button */
    '.sp-b-cta:has(.sp-band){padding:0}',
    '.sp-b-cta:has(.sp-band) .sp-wrap{max-width:none}',
    '.sp-band{position:relative;display:flex;flex-direction:column;justify-content:space-between;min-height:min(60svh,560px);padding:24px clamp(20px,4cqi,40px);background:var(--a);color:var(--ona);text-decoration:none;overflow:hidden;transition:background .15s,color .15s}',
    '.sp-band:hover,.sp-band:focus-visible{background:var(--ona);color:var(--a);outline:none}',
    '.sp-band-s{max-width:34ch;font-size:var(--fm);line-height:1.4;padding-right:64px}',
    '.sp-band-arrow{position:absolute;top:24px;right:clamp(20px,4cqi,40px);width:48px;height:48px}',
    '.sp-band-w{font-family:var(--fh);font-weight:800;line-height:.8;letter-spacing:-.05em;font-size:min(30cqi,calc(170cqi / var(--n,5)));white-space:nowrap;margin-bottom:-.06em}'
  ];

  var chapters = [
    /* every section a flat field, butted together, one thing each */
    '.look-chapters .sp-sec{--sbg:var(--bg);--tx:var(--tx0)}',
    '.look-chapters .sp-n0{--sbg:var(--p);--tx:var(--onp)}',
    '.look-chapters .sp-n1{--sbg:var(--bg);--tx:var(--tx0)}',
    '.look-chapters .sp-n2{--sbg:var(--alt);--tx:var(--onalt)}',
    '.look-chapters .sp-n3{--sbg:#0a0a0a;--tx:#f4f4f4}',
    '.look-chapters .sp-sec{--mut:var(--tx)}',
    '.look-chapters .sp-small,.look-chapters .sp-fact,.look-chapters .sp-item-desc{color:var(--tx)}',
    '.look-chapters .sp-b-hero{min-height:min(90svh,900px);display:flex;flex-direction:column;justify-content:center}',
    '.look-chapters .sp-b-hero>.sp-wrap{width:100%}',
    '.look-chapters .sp-split,.look-chapters .sp-countdown{grid-template-columns:minmax(0,1fr)!important;gap:40px}',
    '.look-chapters .sp-bonus.sp-bonus-sum{background:var(--tx);color:var(--sbg)}',
    '.look-chapters .sp-bonus-sum .sp-bonus-v{color:var(--sbg)}',
    /* two sizes: statement and caption; medium weight, no bold */
    '.look-chapters .sp-h1,.look-chapters .sp-h2,.look-chapters .sp-guarantee-mark,.look-chapters .sp-bigprice b,.look-chapters .sp-cd-u b,.look-chapters .sp-footer-name{font-weight:500;letter-spacing:-.05em;line-height:.9}',
    '.look-chapters .sp-hero .sp-h1{font-size:clamp(3rem,13cqi,11rem);max-width:none}',
    '.look-chapters .sp-h2{font-size:clamp(2.2rem,6.4cqi,5.4rem);max-width:22ch}',
    '.look-chapters .sp-mark-check,.look-chapters .sp-mark-cross,.look-chapters ol.sp-points li::before{color:currentColor}',
    '.look-chapters .sp-guarantee-mark{color:currentColor}',
    '.look-chapters .sp-btn{border-radius:0;background:var(--tx);color:var(--sbg)}',
    '.look-chapters .sp-btn-wa{background:#15803d;color:#fff}',
    '.look-chapters .sp-sticky .sp-btn{background:var(--tx0);color:var(--bg)}',
    '.look-chapters .sp-points li{font-weight:400}',
    '.look-chapters .sp-review blockquote{font-weight:500;font-size:clamp(1.4rem,3cqi,2rem);letter-spacing:-.02em}',
    '.look-chapters .sp-faq details,.look-chapters .sp-bonus{border-radius:0;background:color-mix(in srgb,var(--tx) 9%,var(--sbg))}',
    '.look-chapters .sp-stars{color:currentColor}',
    /* the price printed on a ticket with a stub */
    '.look-chapters .sp-offer{gap:0;background:var(--bg);color:var(--tx0);--tx:var(--tx0);--mut:var(--tx0);position:relative}',
    '.look-chapters .sp-offer-main{padding:clamp(24px,4cqi,40px);display:flex;flex-direction:column;gap:24px}',
    '.look-chapters .sp-offer-main .sp-h2{font-size:clamp(2rem,4.4cqi,3.6rem)}',
    '.look-chapters .sp-offer-stub{padding:clamp(24px,4cqi,40px);border-top:6px dotted var(--sbg);display:flex;flex-direction:column;gap:16px;justify-content:center}',
    '.look-chapters .sp-offer-stub .sp-btn{width:100%;background:var(--tx0);color:var(--bg)}',
    '.look-chapters .sp-offer::before,.look-chapters .sp-offer::after{content:"";position:absolute;width:28px;height:28px;border-radius:50%;background:var(--sbg)}',
    '@container (max-width:859px){.look-chapters .sp-offer::before{left:-14px}.look-chapters .sp-offer::after{right:-14px}.look-chapters .sp-offer::before,.look-chapters .sp-offer::after{top:var(--cut,60%)}}',
    '@container (min-width:860px){.look-chapters .sp-offer{grid-template-columns:minmax(0,7fr) minmax(0,3.4fr);align-items:stretch}.look-chapters .sp-offer-stub{border-top:0;border-left:6px dotted var(--sbg)}.look-chapters .sp-offer::before,.look-chapters .sp-offer::after{left:calc(70% - 14px)}.look-chapters .sp-offer::before{top:-14px}.look-chapters .sp-offer::after{bottom:-14px}}'
  ];

  var unit = [
    /* the motif: a wall unit, wide body with large corners and a dark air slot */
    '.look-unit{--u-r:clamp(18px,3.2cqi,44px)}',
    '.look-unit .sp-b-hero{position:relative;overflow:hidden;min-height:min(88svh,860px);display:flex;flex-direction:column;justify-content:center}',
    '.look-unit .sp-b-hero>.sp-wrap{width:100%}',
    '.look-unit .sp-unit{position:absolute;width:90cqi;height:auto;left:58cqi;top:50%;transform:translateY(-50%);z-index:0}',
    '.look-unit .sp-hero.has-pic:has(.sp-unit){grid-template-columns:minmax(0,1fr)}',
    '.look-unit .sp-hero:has(.sp-unit) .sp-hero-copy{position:relative;z-index:1;max-width:min(52%,560px)}',
    '.look-unit .sp-hero .sp-h1{font-weight:300;letter-spacing:-.03em;font-size:clamp(2.6rem,7cqi,6rem);max-width:12ch;line-height:1.02}',
    '.look-unit .sp-h2{font-weight:300;letter-spacing:-.022em}',
    '.look-unit .sp-btn,.look-unit .sp-wa{border-radius:var(--u-r) var(--u-r) calc(var(--u-r) * .5) calc(var(--u-r) * .5)}',
    '.look-unit .sp-hero-img,.look-unit .sp-photo,.look-unit .sp-gal-img,.look-unit .sp-video{border-radius:calc(var(--u-r) * 2)}',
    '.look-unit .sp-bg-soft{--sbg:var(--alt);--tx:var(--onalt)}',
    '.look-unit .sp-mark{position:relative;width:26px;height:14px;margin-top:.45em;padding:0}',
    '.look-unit .sp-mark svg{display:none}',
    '.look-unit .sp-mark::before{content:"";position:absolute;inset:0;border-radius:5px 5px 3px 3px;background:currentColor}',
    '.look-unit .sp-mark::after{content:"";position:absolute;left:4px;right:4px;bottom:3px;height:2px;border-radius:2px;background:var(--sbg)}',
    '.look-unit .sp-mark-check{color:var(--tx)}',
    '.look-unit .sp-faq details,.look-unit .sp-bonus{border-radius:var(--u-r)}',
    '.look-unit .sp-bg-primary,.look-unit .sp-bg-dark{--sbg:var(--tx0);--tx:var(--bg)}',
    '.look-unit .sp-bg-primary .sp-btn,.look-unit .sp-bg-dark .sp-btn{background:#ffffff;color:var(--tx0)}',
    '@container (max-width:859px){',
    '.look-unit .sp-b-hero{justify-content:flex-start;min-height:0;padding-bottom:50cqi}',
    '.look-unit .sp-hero:has(.sp-unit) .sp-hero-copy{max-width:none}',
    '.look-unit .sp-hero .sp-h1{font-size:clamp(2.4rem,11.5cqi,4rem)}',
    '.look-unit .sp-unit{width:120cqi;right:auto;left:8cqi;top:auto;bottom:-6cqi;transform:none}',
    '}'
  ];


  var stage = [
    /* two panels on 12px margins: the reading column and the photograph that stays put */
    '.look-stage .sp-stage{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:12px}',
    '.look-stage .sp-stage-col{container-type:inline-size;min-width:0;border-radius:20px;overflow:clip;position:relative;z-index:1}',
    '.look-stage .sp-stage-media{position:relative;height:56svh;border-radius:20px;overflow:hidden;background:var(--p);z-index:0}',
    '.look-stage .sp-stage-media img{width:100%;height:100%;object-fit:cover;display:block}',
    '.look-stage .sp-stage-field{height:100%;display:flex;flex-direction:column;gap:16px;align-items:flex-start;justify-content:flex-end;text-align:left;padding:clamp(24px,4cqi,48px);color:var(--onp)}',
    '.look-stage .sp-stage-field span{font-family:var(--fh);font-weight:500;font-size:clamp(2.4rem,6.2cqi,5.2rem);line-height:.98;letter-spacing:-.03em;max-width:none;text-wrap:balance}',
    '.look-stage .sp-stage-field small{font-size:var(--fs);opacity:.85}',
    '.look-stage .sp-stage-bar{position:absolute;left:0;right:0;bottom:0;min-height:56px;display:none;justify-content:space-between;align-items:center;gap:16px;padding:8px 20px;background:var(--bg);color:var(--tx0);font-size:var(--fs)}',
    '@container (min-width:900px){.look-stage .sp-stage{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.look-stage .sp-stage-media{order:2;position:sticky;top:12px;height:calc(100svh - 24px)}}',
    '@container sppage (min-width:900px){.look-stage .sp-stage-bar{display:flex}.look-stage .sp-hero .sp-fact{display:none}.look-stage .sp-stage-field{padding-bottom:96px}}',
    
    '.ed-frame .look-stage .sp-stage-media{height:min(56svh,520px);cursor:pointer}',
    '@container (min-width:900px){.ed-frame .look-stage .sp-stage-media{height:calc(100vh - 120px)}}',
    /* a calm reading column: one measure, modest headings, the text face throughout */
    '.look-stage .sp-sec{padding:clamp(44px,9cqi,80px) clamp(20px,7cqi,64px)}',
    '.look-stage .sp-wrap{max-width:560px;gap:28px}',
    '.look-stage .sp-h1{font-weight:500;letter-spacing:-.02em;line-height:1.05;font-size:clamp(2.4rem,8.5cqi,3.8rem)!important;max-width:14ch}',
    '.look-stage .sp-h2{font-weight:500;letter-spacing:-.02em;line-height:1.05;font-size:clamp(1.9rem,6cqi,2.75rem);max-width:none}',
    '.look-stage .sp-hero .sp-hero-copy{display:flex!important;align-items:center;text-align:center;max-width:none}',
    '.look-stage .sp-hero .sp-h1,.look-stage .sp-hero .sp-lead{margin-inline:auto}',
    '.look-stage .sp-hero .sp-btn{align-self:stretch;width:100%}',
    '.look-stage .sp-split{grid-template-columns:minmax(0,1fr)!important;gap:24px}',
    '.look-stage .sp-bg-soft{--sbg:var(--alt);--tx:var(--tx0)}',
    '.look-stage .sp-btn{border-radius:12px}',
    /* the order form set as a printed price list: name, dot leader, price */
    '.look-stage .sp-order{--fbg:var(--bg);background:none;padding:0;border:0;border-radius:0}',
    '.look-stage .sp-items{gap:4px}',
    '.look-stage .sp-item{border-bottom:0}',
        '.look-stage .sp-item.is-on .sp-item-name,.look-stage .sp-item.is-on .sp-price b{color:var(--p)}',
    '.look-stage .sp-item-body{display:grid;grid-template-columns:auto minmax(16px,1fr) auto;grid-template-areas:"name lead price" "desc desc desc";column-gap:10px;align-items:baseline}',
    '.look-stage .sp-item-body::before{content:"";grid-area:lead;border-bottom:3px dotted var(--line);transform:translateY(-.3em)}',
    '.look-stage .sp-item-name{grid-area:name;font-weight:600}',
    '.look-stage .sp-item-desc{grid-area:desc}',
    '.look-stage .sp-price{grid-area:price;margin:0}',
            '.look-stage .sp-sum{background:none;padding:16px 0 0;border-top:3px dotted var(--line);border-radius:0}',
    '.look-stage .sp-faq details{border-radius:12px;background:var(--alt)}'
  ];

  SP.pageCSS += '\n' + label.concat(chapters, unit, stage).join('\n');
})(window.SP);
