'use client';
/* Client behaviour of the salespage: countdown, the order bar that steps aside, entrance motion. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Props, RenderCtx } from '@/lib/types';
import { L } from '@/lib/i18n';

export function Countdown({ p, ctx, bid }: { p: Props; ctx: RenderCtx; bid: string }) {
  const t = L[ctx.lang] || L.ms;
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    let end: number;
    if (p.mode === 'evergreen') {
      const key = 'spcd-' + bid;
      let start = 0;
      try { start = Number(localStorage.getItem(key)) || 0; } catch { /* storage blocked */ }
      if (!start) { start = Date.now(); try { localStorage.setItem(key, String(start)); } catch { /* ignore */ } }
      end = start + (Number(p.minutes) || 0) * 60000;
    } else end = new Date(p.end).getTime() || 0;
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [p.mode, p.end, p.minutes, bid]);
  const d = left ?? 0;
  const units: [string, number, string][] = [
    ['d', Math.floor(d / 864e5), t.days], ['h', Math.floor(d / 36e5) % 24, t.hours],
    ['m', Math.floor(d / 6e4) % 60, t.mins], ['s', Math.floor(d / 1e3) % 60, t.secs],
  ];
  return (
    <div className={'sp-countdown' + (left === 0 ? ' is-done' : '')}>
      {p.heading && <h2 className="sp-h2">{p.heading}</h2>}
      <div className="sp-cd-row" role="timer">
        {units.map(([k, n, label]) => (
          <div key={k} className="sp-cd-u"><b>{left === null ? '–' : n}</b><span>{label}</span></div>
        ))}
      </div>
      <div className="sp-cd-done">{p.expired || t.expired}</div>
    </div>
  );
}

/** Bottom order bar: steps aside while the order form, the giant button or the footer is on screen. */
export function FixedBar({ live, hasBar, children }: { live: boolean; hasBar: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);
  useEffect(() => {
    if (!live || !hasBar || !('IntersectionObserver' in window)) return;
    const seen = new Set<Element>();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      setAway(seen.size > 0);
    });
    document.querySelectorAll('#order, .sp-b-footer, .sp-band').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [live, hasBar]);
  return <div ref={ref} className={'sp-fixed' + (hasBar ? ' has-bar' : '') + (away ? ' is-away' : '')}>{children}</div>;
}

/** Parts of each section rise in turn as they scroll into view. Added by script only, so content never stays hidden. */
export function Motion() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sel = '.sp-hero-copy > *, .sp-hero-img, .sp-jar, .sp-head > *, .sp-text > *, .sp-points li, .sp-review, .sp-bonus, .sp-faq details, .sp-cd-u, .sp-item, .sp-radio, ' +
      '.sp-offer-main > *, .sp-offer-stub > *, .sp-band, .sp-guarantee > *, .sp-cta > *, .sp-cta-b > *, .sp-countdown > .sp-h2, .sp-footer > *, .sp-figure, .sp-gal-cell, .sp-cust, .sp-sum';
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        const sibs = Array.from(el.parentElement?.children || []).filter((x) => x.classList.contains('sp-rise'));
        el.style.transitionDelay = Math.min(sibs.indexOf(el), 6) * 80 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll(sel).forEach((el) => { el.classList.add('sp-rise'); io.observe(el); });
    return () => io.disconnect();
  }, []);
  return null;
}
