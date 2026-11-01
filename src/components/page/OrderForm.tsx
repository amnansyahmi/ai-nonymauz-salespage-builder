'use client';
/* The checkout: packages, delivery, buyer details, live total.
   On the live page it records the order, then opens WhatsApp with the message filled in. */
import { useMemo, useState, type FormEvent } from 'react';
import type { Props, RenderCtx } from '@/lib/types';
import { L } from '@/lib/i18n';
import { money, waNumber } from '@/lib/format';
import { ChatMark, Rich } from './bits';

declare global { interface Window { fbq?: (...a: unknown[]) => void } }

export default function OrderForm({ p, ctx, bid }: { p: Props; ctx: RenderCtx; bid: string }) {
  const t = L[ctx.lang] || L.ms;
  const items: Props[] = p.items || [];
  const ship: Props[] = p.shipping || [];
  const [qty, setQty] = useState<number[]>(() => items.map((_, i) => (i === 0 ? 1 : 0)));
  const [shipIdx, setShipIdx] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [err, setErr] = useState('');
  const [demo, setDemo] = useState('');
  const [busy, setBusy] = useState(false);
  const wa = waNumber(ctx.settings.whatsapp);

  const q = items.map((_, i) => Math.max(0, Math.min(999, qty[i] || 0)));
  const sub = items.reduce((s, it, i) => s + q[i] * (Number(it.price) || 0), 0);
  const chosen = ship[shipIdx];
  let fee = chosen ? Number(chosen.fee) || 0 : 0;
  if (Number(p.freeShipMin) > 0 && sub >= Number(p.freeShipMin)) fee = 0;
  const total = sub + fee;

  const message = useMemo(() => {
    const lines = [t.orderIntro + (ctx.settings.businessName ? ` (${ctx.settings.businessName})` : '') + ':', ''];
    items.forEach((it, i) => { if (q[i] > 0) lines.push(`• ${q[i]} x ${it.name} = ${money(q[i] * (Number(it.price) || 0))}`); });
    if (chosen) lines.push(`${p.shipLabel || 'Penghantaran'}: ${chosen.label} (${fee ? money(fee) : t.free})`);
    lines.push(`*${t.total}: ${money(total)}*`, '', `${t.name}: ${form.name.trim()}`, `${t.phone}: ${form.phone.trim()}`);
    if (form.address.trim()) lines.push(`${t.address}: ${form.address.trim()}`);
    if (form.note.trim()) lines.push(`${t.note.replace(/\s*\(.*\)/, '')}: ${form.note.trim()}`);
    return lines.join('\n');
  }, [items, q, chosen, fee, total, form, t, ctx.settings.businessName, p.shipLabel]);

  const step = (i: number, d: number) => setQty((prev) => prev.map((v, j) => (j === i ? Math.max(0, Math.min(999, (v || 0) + d)) : v)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!q.some((x) => x > 0)) return setErr(t.pickItem);
    if (!form.name.trim() || !form.phone.trim()) return setErr(t.needName);
    if (p.askAddress && !form.address.trim()) return setErr(t.needAddr);
    if (ctx.editor) {
      setDemo(message);
      return;
    }
    if (!wa) return setErr(t.noWa);
    setBusy(true);
    if (ctx.slug) {
      // Record the order for the seller's order list; never block the buyer on it.
      try {
        await Promise.race([
          fetch('/api/orders', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              slug: ctx.slug,
              items: items.map((it, i) => ({ name: it.name, price: Number(it.price) || 0, qty: q[i] })).filter((x) => x.qty > 0),
              shipping: chosen ? { label: chosen.label, fee } : null,
              total, customer: form,
            }),
            keepalive: true,
          }),
          new Promise((r) => setTimeout(r, 1500)),
        ]);
      } catch { /* the WhatsApp message still carries the order */ }
    }
    if (window.fbq) { try { window.fbq('track', 'Lead', { value: total, currency: 'MYR' }); } catch { /* ignore */ } }
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
    setBusy(false);
    if (window.self !== window.top) window.open(url, '_blank', 'noopener');
    else window.location.href = url;
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fid = (k: string) => `f-${bid}-${k}`;

  return (
    <form className="sp-order" noValidate onSubmit={submit}>
      <div className="sp-items" data-ui>
        {items.map((it, i) => (
          <div key={i} className={'sp-item' + (it.image ? '' : ' sp-item-noimg') + (q[i] > 0 ? ' is-on' : '')}>
            {it.image && <img className="sp-item-img" src={it.image} alt={it.name} loading="lazy" />}
            <div className="sp-item-body">
              <div className="sp-item-name">
                {it.name} {it.badge && <span className="sp-badge">{it.badge}</span>}
              </div>
              {it.desc && <div className="sp-item-desc">{it.desc}</div>}
              <div className="sp-price">
                <b>{money(it.price)}</b>
                {Number(it.oldPrice) > Number(it.price) && <s>{money(it.oldPrice)}</s>}
              </div>
            </div>
            <div className="sp-qty">
              <button type="button" aria-label={`${t.less} ${it.name}`} onClick={() => step(i, -1)}>−</button>
              <input type="number" min={0} max={999} inputMode="numeric" aria-label={it.name} value={q[i]}
                onChange={(e) => setQty((prev) => prev.map((v, j) => (j === i ? parseInt(e.target.value, 10) || 0 : v)))} />
              <button type="button" aria-label={`${t.more} ${it.name}`} onClick={() => step(i, 1)}>+</button>
            </div>
          </div>
        ))}
      </div>

      {ship.length > 0 && (
        <fieldset className="sp-ship" data-ui>
          <legend>{p.shipLabel || 'Penghantaran'}</legend>
          {ship.map((s, i) => (
            <label key={i} className="sp-radio">
              <input type="radio" name={`ship-${bid}`} checked={shipIdx === i} onChange={() => setShipIdx(i)} />
              <span>{s.label}</span>
              <b>{Number(s.fee) ? money(s.fee) : t.free}</b>
            </label>
          ))}
          {Number(p.freeShipMin) > 0 && <p className="sp-small">{t.freeShipFrom} {money(p.freeShipMin)}</p>}
        </fieldset>
      )}

      <fieldset className="sp-cust">
        <legend>{t.customer}</legend>
        <label className="sp-field" htmlFor={fid('name')}><span>{t.name}</span>
          <input id={fid('name')} autoComplete="name" required value={form.name} onChange={set('name')} /></label>
        <label className="sp-field" htmlFor={fid('phone')}><span>{t.phone}</span>
          <input id={fid('phone')} type="tel" inputMode="tel" autoComplete="tel" required value={form.phone} onChange={set('phone')} /></label>
        {p.askAddress && (
          <label className="sp-field" htmlFor={fid('address')}><span>{t.address}</span>
            <textarea id={fid('address')} rows={3} autoComplete="street-address" required value={form.address} onChange={set('address')} /></label>
        )}
        {p.askNote && (
          <label className="sp-field" htmlFor={fid('note')}><span>{t.note}</span>
            <input id={fid('note')} value={form.note} onChange={set('note')} /></label>
        )}
      </fieldset>

      <div className="sp-sum" data-ui>
        <div><span>{t.subtotal}</span><b>{money(sub)}</b></div>
        {ship.length > 0 && <div><span>{p.shipLabel || 'Penghantaran'}</span><b>{chosen && fee === 0 ? t.free : money(fee)}</b></div>}
        <div className="sp-sum-total"><span>{t.total}</span><b>{money(total)}</b></div>
      </div>

      {err && <p className="sp-err" role="alert">{err}</p>}
      <button type="submit" className="sp-btn sp-btn-wa" disabled={busy}>
        <ChatMark />
        <span>{p.btnText || 'Order'}</span>
      </button>
      {p.payNote && <p className="sp-small sp-center"><Rich text={p.payNote} /></p>}
      {demo && (
        <div className="sp-demo">
          <b>{wa ? `Preview: customers will send this to +${wa}` : 'Add your WhatsApp number in Page settings. Customers will send this message:'}</b>
          <pre>{demo}</pre>
        </div>
      )}
    </form>
  );
}
