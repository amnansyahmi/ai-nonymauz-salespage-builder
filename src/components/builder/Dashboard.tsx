'use client';
/* Home: "Which of my pages can take orders, and what do I edit next?" */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Page } from '@/lib/types';
import { store } from '@/lib/store';
import { pageFacts } from '@/lib/page';
import { buildTemplate, TEMPLATES } from '@/lib/templates';
import { THEMES } from '@/lib/theme';
import { fmtPhone, money, relDate } from '@/lib/format';
import { normalizePage } from '@/lib/page';
import { Icon, TopBar, useToast } from './ui';
import Thumb from './Thumb';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const BACKUP_KEY = 'nonymauz.lastBackup';

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const [pages, setPages] = useState<Page[] | null>(null);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tplRef = useRef<HTMLElement>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const load = () => store.list().then(setPages).catch((e) => setError(e.message || 'Could not load your pages.'));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.menu, [data-menu]')) { setMenu(null); setConfirmDel(null); } };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  async function useTemplate(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const p = await store.create(buildTemplate(id));
      router.push('/edit/' + p.id);
    } catch (e: any) { toast(e.message || 'Could not create the page.'); setBusy(false); }
  }
  async function duplicate(p: Page) {
    setMenu(null);
    try { await store.create({ ...p, name: p.name + ' (copy)', slug: null, published: false }); toast('Duplicated ' + p.name); load(); }
    catch (e: any) { toast(e.message); }
  }
  async function remove(p: Page) {
    setMenu(null); setConfirmDel(null);
    try { await store.remove(p.id); toast('Deleted ' + p.name); load(); } catch (e: any) { toast(e.message); }
  }
  function backup() {
    const blob = new Blob([JSON.stringify({ app: 'nonymauz', version: 2, pages })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nonymauz-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    try { localStorage.setItem(BACKUP_KEY, String(Date.now())); } catch { /* ignore */ }
    toast('Backup downloaded');
  }
  async function restore(file: File) {
    try {
      const data = JSON.parse(await file.text());
      const incoming: Page[] = (data.pages || []).map(normalizePage);
      for (const p of incoming) await store.create({ ...p, slug: null, published: false });
      toast('Restored ' + plural(incoming.length, 'page', 'pages'));
      load();
    } catch { toast('That file is not a Nonymauz backup.'); }
  }

  const facts = (pages || []).map(pageFacts);
  const notReady = facts.filter((f) => f.hasOrder && !f.wa).length;
  let lastBk = 0;
  try { lastBk = Number(typeof window !== 'undefined' && localStorage.getItem(BACKUP_KEY)) || 0; } catch { /* ignore */ }

  return (
    <div className="v-home">
      <TopBar active="pages">
        {store.mode === 'demo' && (
          <>
            <button type="button" className="btn" onClick={backup} disabled={!pages?.length}><Icon name="download" /><span>Back up pages</span></button>
            <label className="btn tertiary"><Icon name="upload" /><span>Restore</span>
              <input type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
            </label>
          </>
        )}
      </TopBar>
      <main className="sheet">
        <div className="col">
          <div className="title-row">
            <div>
              <h1>Salespages</h1>
              <p className="subline">
                {pages === null ? 'Loading your pages…' : !pages.length ? 'Pick a template below to make your first page. It takes about 10 minutes.' : (
                  <>
                    {notReady ? <b>{plural(notReady, 'page', 'pages')} can’t take orders yet:</b> : <b>All pages can take orders.</b>}{' '}
                    {notReady ? 'add a WhatsApp number. ' : ''}
                    {store.mode === 'demo' ? (lastBk ? `Last backup ${relDate(lastBk).toLowerCase()}.` : 'Demo mode: pages are saved only in this browser.') : `${plural(pages.filter((p) => p.published).length, 'page', 'pages')} live.`}
                  </>
                )}
              </p>
            </div>
            <button type="button" className="btn primary" onClick={() => tplRef.current?.scrollIntoView({ behavior: 'smooth' })}><Icon name="plus" />New page</button>
          </div>

          {error && <div className="notice" role="alert"><p>{error}</p></div>}

          <section className="block" aria-labelledby="h-pages">
            <div className="block-h"><h2 id="h-pages">Your pages</h2>{!!pages?.length && <p className="num">{plural(pages.length, 'page', 'pages')}</p>}</div>
            {pages && pages.length > 0 ? (
              <table className="ptable">
                <thead><tr><th>Page</th><th className="num c-price">Prices</th><th className="c-wa">Orders go to</th><th className="c-live">Live link</th><th className="num c-date">Edited</th><th><span className="sr">Actions</span></th></tr></thead>
                <tbody>
                  {pages.map((p, i) => {
                    const f = facts[i];
                    const range = !f.packages ? '—' : f.min === f.max ? money(f.min) : `${money(f.min)}–${money(f.max)}`;
                    const pill = <span className={'pill ' + f.status.cls}>{f.status.text}</span>;
                    const mini = { ...p, blocks: p.blocks.slice(0, 1) };
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="pcell">
                            <Link href={'/edit/' + p.id} className="mini-link" tabIndex={-1} aria-hidden="true"><Thumb page={mini} width={800} className="mini" /></Link>
                            <div>
                              <Link className="pname" href={'/edit/' + p.id}>{p.name}</Link>
                              <span className="sub">{plural(f.sections, 'section', 'sections')}{f.packages ? ' · ' + plural(f.packages, 'package', 'packages') : ''}</span>
                              <span className="sub sub-phone">{pill}<span className="num">{range}</span><span>{relDate(p.updatedAt)}</span></span>
                            </div>
                          </div>
                        </td>
                        <td className="num c-price">{range}</td>
                        <td className="c-wa">{f.wa ? <span className="num">{fmtPhone(f.wa.startsWith('0') ? '6' + f.wa : f.wa)}</span> : pill}</td>
                        <td className="c-live">{p.published && p.slug ? <a className="livelink" href={'/' + p.slug} target="_blank" rel="noopener">/{p.slug}</a> : <span className="muted">Not published</span>}</td>
                        <td className="num c-date">{relDate(p.updatedAt)}</td>
                        <td className="acts">
                          <Link className="btn sm" href={'/edit/' + p.id}>Edit</Link>{' '}
                          <button type="button" className="icon-btn" data-menu aria-haspopup="true" aria-expanded={menu === p.id} aria-label={'More actions for ' + p.name}
                            onClick={() => { setMenu(menu === p.id ? null : p.id); setConfirmDel(null); }}><Icon name="more" /></button>
                          {menu === p.id && (
                            <div className="menu" role="menu">
                              {confirmDel === p.id ? (
                                <>
                                  <p>Delete “{p.name}”?{p.published ? ' Its live link stops working.' : ''} This can’t be undone.</p>
                                  <div className="row">
                                    <button type="button" className="btn sm danger-fill" onClick={() => remove(p)}>Delete page</button>
                                    <button type="button" className="btn sm" onClick={() => setConfirmDel(null)}>Cancel</button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {p.published && p.slug && <a role="menuitem" href={'/' + p.slug} target="_blank" rel="noopener"><Icon name="globe" />Open live page</a>}
                                  <button type="button" role="menuitem" onClick={() => duplicate(p)}><Icon name="copy" />Duplicate</button>
                                  <button type="button" role="menuitem" className="danger" onClick={() => setConfirmDel(p.id)}><Icon name="trash" />Delete page…</button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : pages ? (
              <div className="empty-slot">No pages yet. Your pages will be listed here with their prices, live link and the WhatsApp number orders go to.</div>
            ) : <div className="skeleton" aria-hidden="true" />}
          </section>

          <section className="block" id="templates" ref={tplRef} aria-labelledby="h-tpl">
            <div className="block-h"><h2 id="h-tpl">Start from a template</h2><p>Every template has an order form that sends to WhatsApp.</p></div>
            <div className="tpl-grid">
              {TEMPLATES.map((t) => {
                const p = buildTemplate(t.id);
                const f = pageFacts(p);
                return (
                  <article key={t.id} className="tpl">
                    <Thumb page={{ ...p, blocks: p.blocks.slice(0, 3) }} />
                    <div className="tpl-meta">
                      <b>{t.name}</b><span>{t.desc}</span>
                      <span className="sub num">{plural(f.sections, 'section', 'sections')} · {plural(f.packages, 'package', 'packages')} · {THEMES[p.theme.preset]?.label} colours</span>
                    </div>
                    <button type="button" className="tpl-go" onClick={() => useTemplate(t.id)} disabled={busy}><span>Use the {t.name} template</span></button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
