/* Styles for the salespage itself. Shared by the editor preview and the exported file.
   Scoped to .sp-page and driven by the theme variables from SP.themeVars().
   House style (taste-skill page rules): one grid, left-aligned type set large, flat buttons that are
   square or fully round, surfaces separated by a tone step instead of lines or shadows, no uppercase
   labels, no eyebrows, no decorative circles, colour on the action and on whole fields only. */
(function (SP) {
  'use strict';
  SP.pageCSS = [
    '.sp-page{container:sppage / inline-size;background:var(--bg);color:var(--tx0);font-family:var(--fb);font-size:18px;line-height:1.6;-webkit-font-smoothing:antialiased;position:relative}',
    /* five sizes: display, section title, middle, body, small */
    '.sp-page>*{--fx:clamp(2.6rem,9cqi,6rem);--f2:clamp(1.9rem,4.8cqi,3.2rem);--fm:clamp(1.2rem,2.2cqi,1.35rem);--fs:15px}',
    '.sp-page *,.sp-page *::before,.sp-page *::after{box-sizing:border-box}',
    '.sp-page img{max-width:100%;display:block}',
    '.sp-page [hidden]{display:none!important}',
    '.sp-page p{margin:0}',
    '.sp-page :where(a){color:inherit}',

    /* sections: whole fields of colour, generous rhythm */
    '.sp-sec{--tx:var(--tx0);--sbg:var(--bg);color:var(--tx);background:var(--sbg);padding:clamp(64px,11cqi,128px) clamp(20px,4cqi,40px);',
    '--mut:color-mix(in srgb,var(--tx) 74%,var(--sbg));--card:color-mix(in srgb,var(--tx) 5%,var(--sbg));--card2:color-mix(in srgb,var(--tx) 9%,var(--sbg));--line:color-mix(in srgb,var(--tx) 18%,var(--sbg))}',
    '.sp-bg-soft{--sbg:color-mix(in srgb,var(--tx0) 5%,var(--bg))}',
    '.sp-bg-primary{--sbg:var(--p);--tx:var(--onp)}',
    '.sp-bg-dark{--sbg:color-mix(in srgb,var(--p) 10%,#111214);--tx:#f3f3f0}',
    '.sp-wrap{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;gap:clamp(28px,4cqi,48px)}',
    '.sp-b-spacer{padding-block:0}',

    /* type: two sizes do the work, very large and small */
    '.sp-h1,.sp-h2,.sp-h3{font-family:var(--fh);margin:0;font-weight:800;color:var(--tx);text-wrap:balance}',
    '.sp-h1{font-size:var(--fx);line-height:.98;letter-spacing:-.04em;max-width:15ch}',
    '.sp-h2{font-size:var(--f2);line-height:1.04;letter-spacing:-.03em;max-width:18ch}',
    '.sp-h1 strong,.sp-h2 strong,.sp-h3 strong{font-weight:inherit;color:inherit}',
    '.sp-lead{font-size:var(--fm);line-height:1.5;color:var(--tx);max-width:40ch}',
    '.sp-head{display:flex;flex-direction:column;gap:16px;align-items:flex-start}',
    '.sp-small{font-size:var(--fs);color:var(--mut);line-height:1.5}',
    '.sp-center{text-align:center}',

    /* heading beside its content on wide screens */
    '.sp-split{display:grid;grid-template-columns:minmax(0,1fr);gap:28px}',
    '@container (min-width:860px){.sp-split{grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(32px,6cqi,64px);align-items:start}}',

    /* buttons: flat, one fill */
    '.sp-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;align-self:flex-start;background:var(--a);color:var(--ona);font-family:var(--fb);font-weight:600;font-size:18px;line-height:1.2;padding:17px 30px;min-height:56px;border:0;border-radius:var(--rb);text-decoration:none;cursor:pointer;text-align:center;transition:filter .15s,transform .1s}',
    '.sp-btn:hover{filter:brightness(.9)}',
    '.sp-btn:active{transform:translateY(1px)}',
    '.sp-btn:focus-visible{outline:3px solid var(--tx);outline-offset:3px}',
    '.sp-btn svg{width:22px;height:22px;flex:none}',
    '.sp-bg-primary .sp-btn{background:var(--onp);color:var(--p)}',
    '.sp-btn-wa{width:100%;background:#15803d;color:#fff}',

    /* hero */
    '.sp-hero{display:grid;grid-template-columns:minmax(0,1fr);gap:clamp(28px,5cqi,56px);align-items:center}',
    '.sp-hero-copy{display:flex;flex-direction:column;gap:24px;align-items:flex-start}',
    '@container (min-width:860px){.sp-hero.has-pic{grid-template-columns:minmax(0,6fr) minmax(0,5fr)}.sp-hero:not(.has-pic) .sp-h1{max-width:none;font-size:clamp(2.6rem,9.4cqi,7rem)}',
    '.sp-hero:not(.has-pic) .sp-hero-copy{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:32px clamp(32px,6cqi,64px);align-items:end}',
    '.sp-hero:not(.has-pic) .sp-h1{grid-column:1/-1}',
    '.sp-hero:not(.has-pic) .sp-btn{grid-column:2;grid-row:2;width:100%}',
    '.sp-hero:not(.has-pic) .sp-fact{grid-column:2}',
    '.sp-al-center .sp-hero-copy{display:flex}}',
    '.sp-al-center .sp-hero-copy{align-items:center;text-align:center}',
    '.sp-al-center .sp-h1,.sp-al-center .sp-lead{margin-inline:auto}',
    '.sp-al-center .sp-btn{align-self:center}',
    '.sp-fact{font-size:var(--fs);color:var(--mut)}',
    '.sp-hero-img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:var(--r)}',

    /* placeholders (editor only) */
    '.sp-ph{display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;min-height:200px;width:100%;border:2px dashed var(--line);border-radius:var(--r);color:var(--mut);font-size:var(--fs);font-weight:600;background:var(--card)}',
    '.sp-hero .sp-ph{aspect-ratio:4/5;min-height:0}',
    '.sp-ph .ic{width:34px;height:34px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}',

    /* text, photo, gallery, video */
    '.sp-text{display:flex;flex-direction:column;gap:20px}',
    '.sp-text p{max-width:62ch}',
    '.sp-text.sp-al-center{align-items:center;text-align:center}',
    '.sp-text.sp-al-center p,.sp-text.sp-al-center .sp-h2{margin-inline:auto}',
    '.sp-figure{margin:0;display:flex;flex-direction:column;gap:12px}',
    '.sp-figure figcaption,.sp-gal-cell figcaption{font-size:var(--fs);color:var(--mut)}',
    '.sp-photo{width:100%;border-radius:var(--r)}',
    '.sp-photo-narrow{max-width:560px}',
    '.sp-gallery{display:grid;grid-template-columns:repeat(var(--cols,2),minmax(0,1fr));gap:8px}',
    '.sp-gal-cell{margin:0;display:flex;flex-direction:column;gap:8px}',
    '.sp-gal-img{width:100%;border-radius:calc(var(--r) * .5)}',
    '.sp-gallery .sp-ph{min-height:160px}',
    '.sp-video{position:relative;width:100%;aspect-ratio:16/9;border-radius:var(--r);overflow:hidden;background:#000}',
    '.sp-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}',
    '.sp-video-ph{display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;color:#d9d9d6;font-size:var(--fs);padding:16px;text-align:center;background:#1c1f22}',
    '.sp-video-ph svg{width:64px;height:64px;color:var(--a)}',

    /* point lists: a mark and the words, no boxes */
    '.sp-points{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:22px}',
    '.sp-points li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:14px;align-items:start;font-size:var(--fm);line-height:1.4;font-weight:500}',
    '.sp-mark{display:block;padding-top:.15em}',
    '.sp-mark svg{width:24px;height:24px;display:block}',
    '.sp-mark-check{color:var(--p)}',
    '.sp-bg-primary .sp-mark-check,.sp-bg-dark .sp-mark-check{color:currentColor}',
    '.sp-mark-cross{color:#b42318}',
    '.sp-bg-dark .sp-mark-cross{color:#ff8b7e}',
    'ol.sp-points{counter-reset:pt}',
    'ol.sp-points li{counter-increment:pt;grid-template-columns:2.2em minmax(0,1fr)}',
    'ol.sp-points li::before{content:counter(pt) ".";font-family:var(--fh);font-weight:800;color:var(--p)}',
    '.sp-bg-primary ol.sp-points li::before,.sp-bg-dark ol.sp-points li::before{color:currentColor}',

    /* order form: a field one tone step from the section */
    '.sp-order{display:flex;flex-direction:column;gap:24px;background:var(--card);border-radius:var(--r);padding:clamp(20px,3cqi,32px)}',
    '.sp-bg-soft .sp-order{background:var(--bg)}',
    '.sp-bg-primary .sp-order,.sp-bg-dark .sp-order{background:var(--bg);color:var(--tx0);--tx:var(--tx0);--sbg:var(--bg);--mut:color-mix(in srgb,var(--tx0) 74%,var(--bg));--line:color-mix(in srgb,var(--tx0) 18%,var(--bg));--card:color-mix(in srgb,var(--tx0) 5%,var(--bg));--card2:color-mix(in srgb,var(--tx0) 9%,var(--bg))}',
    '.sp-items{display:flex;flex-direction:column;gap:8px}',
    '.sp-item{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px;border-radius:calc(var(--r) * .7);background:var(--sbg);outline:2px solid transparent;outline-offset:-2px;transition:outline-color .15s}',
    '.sp-bg-soft .sp-item{background:var(--card)}',
    '.sp-item-noimg{grid-template-columns:minmax(0,1fr) auto}',
    '.sp-item.is-on{outline-color:var(--p)}',
    '.sp-item-img{width:72px;height:72px;object-fit:cover;border-radius:calc(var(--r) * .5)}',
    '.sp-item .sp-ph{min-height:72px;height:72px;width:72px;border-width:1.5px}',
    '.sp-item .sp-ph span{display:none}',
    '.sp-item .sp-ph .ic{width:24px;height:24px}',
    '.sp-item-name{font-weight:600;line-height:1.3}',
    '.sp-item-desc{font-size:var(--fs);color:var(--mut);line-height:1.4}',
    '.sp-badge{display:inline-block;font-size:var(--fs);font-weight:600;color:var(--tx);background:color-mix(in srgb,var(--p) 14%,var(--sbg));padding:2px 8px;border-radius:var(--rb);vertical-align:1px;white-space:nowrap}',
    '.sp-price{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-top:4px;font-variant-numeric:tabular-nums}',
    '.sp-price b{font-weight:700}',
    '.sp-price s,.sp-bigprice s{color:var(--mut)}',
    '.sp-qty{display:flex;align-items:center;border-radius:var(--rb);overflow:hidden;background:var(--card2)}',
    '.sp-qty button{width:40px;height:44px;border:0;background:none;font-size:var(--fm);font-weight:600;color:var(--tx);cursor:pointer;font-family:inherit}',
    '.sp-qty button:hover{background:color-mix(in srgb,var(--tx) 8%,transparent)}',
    '.sp-qty input{width:36px;height:44px;border:0;text-align:center;font:600 1rem var(--fb);color:var(--tx);background:none;font-variant-numeric:tabular-nums;-moz-appearance:textfield;appearance:textfield}',
    '.sp-qty input::-webkit-inner-spin-button,.sp-qty input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}',
    '.sp-order fieldset{border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}',
    '.sp-order legend{font-weight:700;margin-bottom:10px;padding:0}',
    '.sp-radio{display:flex;gap:12px;align-items:center;padding:14px 16px;border-radius:calc(var(--r) * .7);cursor:pointer;background:var(--sbg);outline:2px solid transparent;outline-offset:-2px}',
    '.sp-bg-soft .sp-radio{background:var(--card)}',
    '.sp-radio:has(input:checked){outline-color:var(--p)}',
    '.sp-radio input{accent-color:var(--p);width:18px;height:18px;margin:0}',
    '.sp-radio span{flex:1}',
    '.sp-radio b{font-weight:600;font-variant-numeric:tabular-nums}',
    '.sp-field{display:flex;flex-direction:column;gap:6px;font-size:var(--fs);font-weight:600}',
    '.sp-field input,.sp-field textarea{font:400 1rem var(--fb);color:var(--tx);background:var(--sbg);border:1px solid var(--line);border-radius:calc(var(--r) * .5);padding:13px 14px;width:100%;resize:vertical}',
    '.sp-bg-soft .sp-field input,.sp-bg-soft .sp-field textarea{background:var(--card)}',
    '.sp-field input:focus,.sp-field textarea:focus{outline:2px solid var(--p);outline-offset:0;border-color:var(--p)}',
    '.sp-sum{display:flex;flex-direction:column;gap:6px;font-variant-numeric:tabular-nums}',
    '.sp-sum div{display:flex;justify-content:space-between;gap:12px}',
    '.sp-sum-total{margin-top:8px;font-family:var(--fh);font-size:var(--fm);font-weight:800;align-items:baseline}',
    '.sp-err{background:#fde8e6;color:#9b1c13;border-radius:6px;padding:10px 12px;font-weight:600;font-size:var(--fs)}',
    '.sp-demo{background:color-mix(in srgb,#15803d 10%,var(--sbg));border-radius:8px;padding:14px;font-size:var(--fs);display:flex;flex-direction:column;gap:8px}',
    '.sp-demo pre{margin:0;white-space:pre-wrap;font:inherit}',

    /* offer: the price set large beside what is included */
    '.sp-offer{display:grid;grid-template-columns:minmax(0,1fr);gap:40px}',
    '@container (min-width:860px){.sp-offer{grid-template-columns:minmax(0,6fr) minmax(0,5fr);gap:64px;align-items:start}}',
    '.sp-offer-main,.sp-offer-stub{display:flex;flex-direction:column;gap:20px;align-items:flex-start}',
    '.sp-bigprice{display:flex;gap:16px;align-items:baseline;flex-wrap:wrap;font-variant-numeric:tabular-nums}',
    '.sp-bigprice b{font-family:var(--fh);font-size:var(--fx);line-height:.9;letter-spacing:-.04em;font-weight:800}',
    '.sp-bigprice s{font-size:var(--fm)}',
    '.sp-offer-meta{font-weight:600}',

    /* bonuses: rows with their value */
    '.sp-bonuses{display:flex;flex-direction:column;gap:6px}',
    '.sp-bonus{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:baseline;padding:18px 20px;border-radius:calc(var(--r) * .7);background:var(--card)}',
    '.sp-bonus-t{font-weight:700}',
    '.sp-bonus-v{font-variant-numeric:tabular-nums;color:var(--mut)}',
    '.sp-bonus-sum{background:var(--tx);color:var(--sbg);font-weight:700}',
    '.sp-bonus-sum .sp-bonus-v{color:var(--sbg)}',

    /* reviews: quotations, set large */
    '.sp-reviews{display:grid;grid-template-columns:minmax(0,1fr);gap:48px}',
    '@container (min-width:680px){.sp-reviews{grid-template-columns:repeat(2,minmax(0,1fr));gap:56px 64px}}',
    '.sp-review{margin:0;display:flex;flex-direction:column;gap:16px}',
    '.sp-review blockquote{margin:0;font-family:var(--fh);font-size:var(--fm);line-height:1.35;font-weight:600}',
    '.sp-review blockquote::before{content:"\\201C"}',
    '.sp-review blockquote::after{content:"\\201D"}',
    '.sp-review figcaption{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:var(--fs);color:var(--mut)}',
    '.sp-review figcaption b{color:var(--tx);font-weight:600}',
    '.sp-stars{display:inline-flex;gap:1px;color:#c98a00}',
    '.sp-bg-dark .sp-stars,.sp-bg-primary .sp-stars{color:currentColor}',
    '.sp-stars svg{width:14px;height:14px}',
    '.sp-av{width:40px;height:40px;border-radius:50%;object-fit:cover;flex:none}',

    /* questions */
    '.sp-faq{display:flex;flex-direction:column;gap:6px}',
    '.sp-faq details{border-radius:calc(var(--r) * .7);background:var(--card)}',
    '.sp-faq summary{cursor:pointer;padding:20px 56px 20px 20px;font-weight:600;list-style:none;position:relative}',
    '.sp-faq summary::-webkit-details-marker{display:none}',
    '.sp-faq summary::after{content:"+";position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:var(--fm);font-weight:400}',
    '.sp-faq details[open] summary::after{content:"\\2212"}',
    '.sp-faq details div{padding:0 20px 20px;max-width:60ch}',

    /* countdown: its heading beside the clock */
    '.sp-countdown{display:grid;grid-template-columns:minmax(0,1fr);gap:24px;align-items:center}',
    '@container (min-width:860px){.sp-countdown{grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(32px,6cqi,64px)}}',
    '.sp-cd-row{display:flex;gap:clamp(20px,4cqi,48px)}',
    '.sp-cd-u{display:flex;flex-direction:column;gap:6px}',
    '.sp-cd-u b{font-family:var(--fh);font-size:var(--fx);line-height:.9;font-variant-numeric:tabular-nums;letter-spacing:-.04em;font-weight:800}',
    '.sp-cd-u span{font-size:var(--fs);color:var(--mut)}',
    '.sp-cd-done{display:none;font-weight:700;grid-column:1/-1}',
    '.sp-countdown.is-done .sp-cd-row{opacity:.35}',
    '.sp-countdown.is-done .sp-cd-done{display:block}',

    /* guarantee: the promise's figure set large */
    '.sp-guarantee{display:grid;grid-template-columns:minmax(0,1fr);gap:20px}',
    '@container (min-width:680px){.sp-guarantee{grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:64px;align-items:center}}',
    '.sp-guarantee-mark{font-family:var(--fh);font-weight:800;font-size:var(--fx);line-height:.9;letter-spacing:-.04em;color:var(--p)}',
    '.sp-bg-primary .sp-guarantee-mark,.sp-bg-dark .sp-guarantee-mark{color:currentColor}',
    '.sp-guarantee-t{display:flex;flex-direction:column;gap:16px}',
    '.sp-guarantee-t p{max-width:52ch}',

    /* call to action, space, footer */
    '.sp-cta{display:grid;grid-template-columns:minmax(0,1fr);gap:28px;align-items:end}',
    '@container (min-width:680px){.sp-cta{grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:clamp(32px,6cqi,64px)}.sp-cta .sp-btn{width:100%}}',
    '.sp-cta-b{display:flex;flex-direction:column;gap:24px}',
    '.sp-cta .sp-lead{max-width:none}',
    '.sp-spacer-s{height:24px}.sp-spacer-m{height:64px}.sp-spacer-l{height:128px}',
    '.sp-b-footer{padding-block:clamp(56px,9cqi,96px) 40px}',
    '.sp-footer{display:flex;flex-direction:column;gap:28px}',
    '.sp-footer-name{font-family:var(--fh);font-weight:800;font-size:var(--fx);line-height:.95;letter-spacing:-.04em}',
    '.sp-footer-meta{display:flex;flex-wrap:wrap;gap:8px 32px;font-size:var(--fs);color:var(--mut)}',

    /* order bar at the bottom of the screen, WhatsApp beside it */
    '.sp-fixed{position:fixed;left:0;right:0;bottom:0;z-index:50;pointer-events:none}',
    '.sp-fixed>*{pointer-events:auto}',
    '.sp-wa{display:grid;place-items:center;flex:none;width:56px;height:56px;border-radius:var(--rb);background:#15803d;color:#fff}',
    '.sp-wa svg{width:28px;height:28px}',
    '.sp-fixed:not(.has-bar) .sp-wa{position:absolute;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));border-radius:50%;box-shadow:0 6px 20px rgba(0,0,0,.25)}', // taste-skill-ignore: real overlay
    '.sp-sticky{display:flex;gap:8px;justify-content:center;padding:10px max(16px,env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));background:var(--bg);box-shadow:0 -10px 30px rgba(0,0,0,.08)}', // taste-skill-ignore: real overlay
    '.sp-sticky .sp-btn{flex:1;max-width:480px;min-height:56px;padding-block:14px;align-self:stretch}',
    '.sp-sticky{transition:transform .3s ease}',
    '.sp-fixed.is-away .sp-sticky{transform:translateY(110%)}',
    '.sp-page.has-sticky{padding-bottom:76px}',

    /* small screens */
    '@container (max-width:600px){',

    '.sp-btn{width:100%;align-self:stretch}',
    '.sp-al-center .sp-btn{align-self:stretch}',
    '.sp-item{grid-template-columns:56px minmax(0,1fr);grid-template-areas:"img body" "qty qty"}',
    '.sp-item-noimg{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"body qty"}',
    '.sp-item-img,.sp-item .sp-ph{grid-area:img;width:56px;height:56px;min-height:56px}',
    '.sp-item-body{grid-area:body}',
    '.sp-item .sp-qty{grid-area:qty;justify-self:end}',
    '.sp-item-noimg .sp-qty{justify-self:auto}',
    '.sp-gallery[style*="--cols:3"]{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.sp-hero-img,.sp-hero .sp-ph{aspect-ratio:1/1}',
    '}',
    /* entrance: parts of each section rise in turn (added by script only, so content never stays hidden) */
    '.sp-rise{opacity:0;transform:translateY(28px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}',
    '.sp-rise.is-in{opacity:1;transform:none}',
    '.sp-hero-img.sp-rise{transform:scale(1.04)}',
    '.sp-hero-img.sp-rise.is-in{transform:none;transition-duration:1.4s}',
    '@media (prefers-reduced-motion:reduce){.sp-btn,.sp-item{transition:none}.sp-rise{opacity:1;transform:none;transition:none}}'
  ].join('\n');
})(window.SP);
