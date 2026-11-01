'use client';
/* The edit panel: forms generated from each block's field schema, the page settings, and the WhatsApp message preview. */
import { useState, type ReactNode } from 'react';
import type { Field } from '@/lib/blocks';
import { BLOCKS } from '@/lib/blocks';
import type { Page, Props } from '@/lib/types';
import { CORNERS, FONTS, LOOKS, THEMES } from '@/lib/theme';
import { L } from '@/lib/i18n';
import { fmtPhone, money, waNumber } from '@/lib/format';
import { shrinkImage, store } from '@/lib/store';
import { Icon, useToast } from './ui';

/** Applies a change to a draft copy of the page. `key` groups fast typing into one undo step. */
export type Mutate = (key: string | null, fn: (draft: Page) => void) => void;
type Getter = (d: Page) => Props;

export function FieldList({ fields, values, get, keyBase, mutate, blockProps }: {
  fields: Field[]; values: Props; get: Getter; keyBase: string; mutate: Mutate; blockProps: Props;
}) {
  return (
    <>
      {fields.map((f) => ('showIf' in f && f.showIf && !f.showIf(blockProps)) ? null : (
        <FieldEl key={f.key} f={f} value={values[f.key]} get={get} k={keyBase + '.' + f.key} mutate={mutate} blockProps={blockProps} />
      ))}
    </>
  );
}

function FieldEl({ f, value, get, k, mutate, blockProps }: { f: Field; value: any; get: Getter; k: string; mutate: Mutate; blockProps: Props }) {
  const id = 'fld-' + k.replace(/[^\w-]/g, '-');
  const set = (v: any, groupKey: string | null = k) => mutate(groupKey, (d) => { get(d)[f.key] = v; });
  const hint = 'hint' in f && f.hint ? <p className="fld-hint" id={id + '-h'}>{f.hint}</p> : null;
  const describedBy = hint ? id + '-h' : undefined;

  switch (f.type) {
    case 'text': case 'number': case 'datetime':
      return (
        <div className={'fld' + (f.half ? ' half' : '')}>
          <label htmlFor={id} className="fld-label">{f.label}</label>
          <input id={id} aria-describedby={describedBy} type={f.type === 'datetime' ? 'datetime-local' : f.type === 'number' ? 'number' : 'text'}
            {...(f.type === 'number' ? { min: 0, step: 'any', inputMode: 'decimal' as const } : {})}
            value={value ?? ''} onChange={(e) => set(f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)} />
          {hint}
        </div>
      );
    case 'textarea':
      return (
        <div className="fld">
          <label htmlFor={id} className="fld-label">{f.label}</label>
          <textarea id={id} rows={f.rows || 3} aria-describedby={describedBy} value={value || ''} onChange={(e) => set(e.target.value)} />
          {hint}
        </div>
      );
    case 'select':
      return (
        <div className="fld">
          <label htmlFor={id} className="fld-label">{f.label}</label>
          <select id={id} value={String(value)} onChange={(e) => set(e.target.value, null)}>
            {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {hint}
        </div>
      );
    case 'segment':
      return (
        <div className="fld">
          <span className="fld-label" id={id}>{f.label}</span>
          <div className="seg seg-full" role="radiogroup" aria-labelledby={id}>
            {f.options.map(([v, l]) => {
              const on = String(value) === String(v);
              return <button key={v} type="button" role="radio" aria-checked={on} className={on ? 'on' : ''} onClick={() => set(v, null)}>{l}</button>;
            })}
          </div>
          {hint}
        </div>
      );
    case 'toggle':
      return (
        <div className="fld">
          <label className="switch" htmlFor={id}>
            <input type="checkbox" id={id} checked={!!value} onChange={(e) => set(e.target.checked, null)} />
            <span className="knob" aria-hidden="true" /><span>{f.label}</span>
          </label>
          {hint}
        </div>
      );
    case 'image':
      return <ImageField id={id} label={f.label} value={value} onChange={(v) => set(v, null)} />;
    case 'list':
      return <ListField f={f} items={value || []} get={get} k={k} mutate={mutate} blockProps={blockProps} />;
  }
}

function ImageField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  async function take(file?: File | null) {
    if (!file) return;
    setBusy(true);
    try { onChange(await store.uploadImage(await shrinkImage(file))); }
    catch (e: any) { toast(e.message || 'Could not upload that photo.'); }
    setBusy(false);
  }
  return (
    <div className="fld">
      <span className="fld-label">{label}</span>
      <div className={'imgfld' + (busy ? ' busy' : '') + (over ? ' over' : '')}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}>
        {value ? (
          <>
            <img src={value} alt="" />
            <div className="imgfld-acts">
              <label className="btn sm" htmlFor={id}><Icon name="upload" />Change</label>
              <button type="button" className="btn sm danger" onClick={() => onChange('')}><Icon name="trash" />Remove</button>
            </div>
          </>
        ) : (
          <label className="imgdrop" htmlFor={id}><Icon name="upload" /><b>{busy ? 'Uploading…' : 'Upload photo'}</b><small>or drop a picture here</small></label>
        )}
        <input type="file" accept="image/*" id={id} hidden onChange={(e) => { take(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <details className="imgurl">
        <summary>Use a web link instead</summary>
        <input type="url" placeholder="https://…" aria-label="Photo web link" defaultValue={/^https?:/.test(value || '') ? value : ''} onBlur={(e) => e.target.value.trim() !== value && onChange(e.target.value.trim())} />
      </details>
    </div>
  );
}

function ListField({ f, items, get, k, mutate, blockProps }: { f: Extract<Field, { type: 'list' }>; items: Props[]; get: Getter; k: string; mutate: Mutate; blockProps: Props }) {
  const [open, setOpen] = useState<number | null>(null);
  const arr = (d: Page) => (get(d)[f.key] = get(d)[f.key] || []) as Props[];
  const move = (i: number, j: number) => mutate(null, (d) => { const a = arr(d); a.splice(j, 0, a.splice(i, 1)[0]); });
  return (
    <div className="fld">
      <span className="fld-label">{f.label}</span>
      {f.hint && <p className="fld-hint">{f.hint}</p>}
      <div className="list">
        {items.map((item, i) => {
          const title = String((f.titleKey ? item[f.titleKey] : '') || `${f.itemLabel} ${i + 1}`).replace(/\*\*/g, '').slice(0, 40);
          return (
            <details key={i} className="list-item" open={open === i} onToggle={(e) => { const o = (e.target as HTMLDetailsElement).open; if (o) setOpen(i); else if (open === i) setOpen(null); }}>
              <summary>
                <span className="li-t">{title}</span>
                <span className="li-tools">
                  <ToolBtn icon="up" label="Move up" disabled={i === 0} on={() => move(i, i - 1)} />
                  <ToolBtn icon="down" label="Move down" disabled={i === items.length - 1} on={() => move(i, i + 1)} />
                  <ToolBtn icon="copy" label="Duplicate" on={() => mutate(null, (d) => { arr(d).splice(i + 1, 0, JSON.parse(JSON.stringify(item))); })} />
                  <ToolBtn icon="trash" label="Remove" on={() => mutate(null, (d) => { arr(d).splice(i, 1); })} />
                </span>
              </summary>
              <div className="list-body">
                <FieldList fields={f.fields} values={item} get={(d) => arr(d)[i]} keyBase={`${k}.${i}`} mutate={mutate} blockProps={blockProps} />
              </div>
            </details>
          );
        })}
      </div>
      <button type="button" className="btn add" onClick={() => { mutate(null, (d) => { arr(d).push(f.newItem()); }); setOpen(items.length); }}>
        <Icon name="plus" />{f.addLabel}
      </button>
    </div>
  );
}

function ToolBtn({ icon, label, on, disabled }: { icon: string; label: string; on: () => void; disabled?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={(e) => { e.preventDefault(); e.stopPropagation(); on(); }}>
      <Icon name={icon} />
    </button>
  );
}

/* ---------- signature: the WhatsApp message a customer will send ---------- */
export function orderMessage(p: Page): string | null {
  const s = p.settings, t = L[s.lang] || L.ms;
  const ob = p.blocks.find((b) => b.type === 'order');
  if (!ob || !(ob.props.items || []).length) return null;
  const o = ob.props, it = o.items[0], ship = (o.shipping || [])[0];
  const sub = Number(it.price) || 0;
  let fee = ship ? Number(ship.fee) || 0 : 0;
  if (Number(o.freeShipMin) > 0 && sub >= Number(o.freeShipMin)) fee = 0;
  const lines = [t.orderIntro + (s.businessName ? ` (${s.businessName})` : '') + ':', '', `• 1 x ${it.name} = ${money(sub)}`];
  if (ship) lines.push(`${o.shipLabel || 'Penghantaran'}: ${ship.label} (${fee ? money(fee) : t.free})`);
  lines.push(`*${t.total}: ${money(sub + fee)}*`, '', `${t.name}: …`, `${t.phone}: …`);
  if (o.askAddress) lines.push(`${t.address}: …`);
  return lines.join('\n');
}

export function WaPreview({ page }: { page: Page }) {
  const msg = orderMessage(page);
  const wa = waNumber(page.settings.whatsapp);
  if (!msg) return <p className="fld-hint">Add an order form section and customers can order straight to your WhatsApp.</p>;
  const first = page.blocks.find((b) => b.type === 'order')!.props.items[0];
  return (
    <div className="wa-prev">
      <div className="wa-prev-h"><b>What customers send you</b>{wa ? <span className="wa-to num">to {fmtPhone(wa)}</span> : <span className="pill warn">No WhatsApp number</span>}</div>
      <pre className="wa-msg">{msg}</pre>
      <p className="fld-hint">Example with one {first.name}. Each customer’s own choices fill in when they order.</p>
    </div>
  );
}

/* ---------- page settings (nothing selected) ---------- */
export function PageSettings({ page, mutate }: { page: Page; mutate: Mutate }) {
  const t = page.theme, s = page.settings;
  const sec = (title: string, body: ReactNode) => <div className="form-sec"><h3>{title}</h3>{body}</div>;
  const sF = (f: Field) => <FieldEl f={f} value={(s as any)[f.key]} get={(d) => d.settings as any} k={'settings.' + f.key} mutate={mutate} blockProps={s as any} />;
  const pick = <K extends string>(label: string, entries: [K, ReactNode, string?][], current: string, onPick: (k: K) => void, cls: string) => (
    <div className={cls} role="radiogroup" aria-label={label}>
      {entries.map(([k, inner, title]) => (
        <button key={k} type="button" role="radio" aria-checked={current === k} title={title} className={current === k ? 'on' : ''} onClick={() => onPick(k)}>{inner}</button>
      ))}
    </div>
  );
  return (
    <>
      <div className="panel-head"><h2>Page settings</h2><p>Tap any section on the page to edit its words, photos and prices.</p></div>
      <div className="form">
        {sec('Orders', <>
          {sF({ type: 'text', key: 'businessName', label: 'Business name', hint: 'Shown in the WhatsApp order message.' })}
          {sF({ type: 'text', key: 'whatsapp', label: 'WhatsApp number for orders', hint: 'E.g. 012-345 6789. Orders from your page go to this number.' })}
          <WaPreview page={page} />
          {sF({ type: 'segment', key: 'lang', label: 'Page language', options: [['ms', 'Bahasa Melayu'], ['en', 'English']], hint: 'For buttons and labels like "Jumlah" or "Total".' })}
        </>)}
        {sec('Layout style', pick('Layout style', (Object.keys(LOOKS) as (keyof typeof LOOKS)[]).map((k) => [k, <><b>{LOOKS[k].label}</b><span>{LOOKS[k].hint}</span></>, LOOKS[k].hint]),
          t.look, (k) => mutate(null, (d) => { d.theme.look = k; }), 'fontpick lookpick'))}
        {sec('Colours', <>
          <div className="swatches" role="radiogroup" aria-label="Colour theme">
            {Object.entries(THEMES).map(([k, th]) => (
              <button key={k} type="button" role="radio" aria-checked={t.preset === k} className={'swatch' + (t.preset === k ? ' on' : '')} title={th.label}
                onClick={() => mutate(null, (d) => { Object.assign(d.theme, { preset: k, primary: th.primary, accent: th.accent, bg: th.bg, text: th.text, alt: th.alt || '' }); })}>
                <span className="sw" style={{ background: th.bg }}><i style={{ background: th.primary }} /><i style={{ background: th.accent }} /></span>{th.label}
              </button>
            ))}
          </div>
          <div className="colors">
            {([['primary', 'Brand'], ['accent', 'Buttons'], ['bg', 'Background'], ['text', 'Text']] as const).map(([key, label]) => (
              <label key={key} className="color" htmlFor={'clr-' + key}>
                <input type="color" id={'clr-' + key} value={t[key]} onChange={(e) => mutate('theme.' + key, (d) => { d.theme[key] = e.target.value; d.theme.preset = 'custom'; })} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </>)}
        {sec('Letters & shape', <>
          {pick('Font style', Object.entries(FONTS).map(([k, fo]) => [k, <><b style={{ fontFamily: fo.h }}>Aa</b><span>{fo.label}</span></>]), t.font, (k) => mutate(null, (d) => { d.theme.font = k; }), 'fontpick')}
          <FieldEl f={{ type: 'segment', key: 'corners', label: 'Corners', options: (Object.keys(CORNERS) as (keyof typeof CORNERS)[]).map((k) => [k, CORNERS[k].label]) }}
            value={t.corners} get={(d) => d.theme as any} k="theme.corners" mutate={mutate} blockProps={t as any} />
        </>)}
        {sec('Helpful extras', <>
          {sF({ type: 'toggle', key: 'waFloat', label: 'WhatsApp chat button' })}
          {sF({ type: 'toggle', key: 'sticky', label: 'Order button that stays on screen', hint: 'Stays at the bottom while visitors scroll. Great on phones.' })}
          {s.sticky && sF({ type: 'text', key: 'stickyText', label: 'Button text' })}
        </>)}
        {sec('Sharing & ads', <>
          {sF({ type: 'text', key: 'seoTitle', label: 'Title when shared', hint: 'Shown on Google and in WhatsApp and Facebook link previews. Leave empty to use your headline.' })}
          {sF({ type: 'textarea', key: 'seoDesc', label: 'Description when shared', rows: 2 })}
          {sF({ type: 'text', key: 'pixelId', label: 'Facebook Pixel ID (optional)', hint: 'Numbers only. Tracks visits and WhatsApp orders for your Facebook ads.' })}
        </>)}
      </div>
    </>
  );
}

export function BlockPanel({ page, id, mutate, onBack, onAction }: { page: Page; id: string; mutate: Mutate; onBack: () => void; onAction: (a: 'dup' | 'del') => void }) {
  const b = page.blocks.find((x) => x.id === id);
  if (!b) return null;
  const def = BLOCKS[b.type];
  const get: Getter = (d) => d.blocks.find((x) => x.id === id)!.props;
  return (
    <>
      <div className="panel-head">
        <button type="button" className="link-btn" onClick={onBack}><Icon name="back" />Page settings</button>
        <h2><span className="tile"><Icon name={def.icon} /></span>{def.label}</h2>
      </div>
      <div className="form">
        <FieldList fields={def.fields} values={b.props} get={get} keyBase={b.id} mutate={mutate} blockProps={b.props} />
      </div>
      {b.type === 'order' && <div className="form-sec" style={{ marginTop: 24 }}><WaPreview page={page} /></div>}
      <div className="panel-foot">
        <button type="button" className="btn sm" onClick={() => onAction('dup')}><Icon name="copy" />Duplicate section</button>
        <button type="button" className="btn sm danger" onClick={() => onAction('del')}><Icon name="trash" />Delete section</button>
      </div>
    </>
  );
}
