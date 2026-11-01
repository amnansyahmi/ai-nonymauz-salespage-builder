'use client';
/* One interface for the builder's data. Cloud mode uses Supabase; demo mode keeps pages in this browser. */
import type { Page } from './types';
import { normalizePage } from './page';
import { clone, uid } from './format';
import { hasSupabase } from './supabase/env';
import { supabaseBrowser } from './supabase/client';

export interface Order {
  id: string; slug: string; createdAt: string; total: number;
  items: { name: string; price: number; qty: number }[];
  shipping: { label: string; fee: number } | null;
  customer: { name: string; phone: string; address?: string; note?: string };
}

export interface Store {
  mode: 'cloud' | 'demo';
  list(): Promise<Page[]>;
  get(id: string): Promise<Page | null>;
  create(page: Page): Promise<Page>;
  save(page: Page): Promise<void>;
  remove(id: string): Promise<void>;
  /** Puts the page live at /<slug>. Returns an error message the seller can act on. */
  publish(page: Page, slug: string): Promise<{ ok: true; slug: string } | { ok: false; error: string }>;
  unpublish(page: Page): Promise<void>;
  uploadImage(blob: Blob): Promise<string>;
  orders(): Promise<Order[]>;
}

/* ---------------- demo mode: this browser only ---------------- */
const KEY = 'nonymauz.pages.v2';
const OLD_KEY = 'nonymauz.pages.v1'; // pages made with the first (static) version on the same domain

function readLocal(): Page[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (JSON.parse(raw) as Page[]).map(normalizePage);
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const pages = (JSON.parse(old) as Page[]).map(normalizePage);
      localStorage.setItem(KEY, JSON.stringify(pages));
      return pages;
    }
  } catch { /* storage blocked or corrupt */ }
  return [];
}
function writeLocal(pages: Page[]) {
  try { localStorage.setItem(KEY, JSON.stringify(pages)); }
  catch { throw new Error('Browser storage is full. Use smaller photos or delete old pages.'); }
}

const demoStore: Store = {
  mode: 'demo',
  async list() { return readLocal().sort((a, b) => b.updatedAt - a.updatedAt); },
  async get(id) { return readLocal().find((p) => p.id === id) || null; },
  async create(page) { const p = { ...clone(page), id: uid(), updatedAt: Date.now() }; writeLocal([...readLocal(), p]); return p; },
  async save(page) {
    const all = readLocal();
    const i = all.findIndex((p) => p.id === page.id);
    const p = { ...clone(page), updatedAt: Date.now() };
    if (i >= 0) all[i] = p; else all.push(p);
    writeLocal(all);
  },
  async remove(id) { writeLocal(readLocal().filter((p) => p.id !== id)); },
  async publish() { return { ok: false, error: 'Publishing needs the online version. Ask your admin to connect Supabase.' }; },
  async unpublish() { /* nothing to do */ },
  async uploadImage(blob) {
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(blob); });
  },
  async orders() { return []; },
};

/* ---------------- cloud mode: Supabase ---------------- */
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/;
const RESERVED = new Set(['dashboard', 'edit', 'login', 'logout', 'auth', 'api', 'preview', 'orders', 'admin', 'settings', 'p', '_next', 'favicon.ico']);

function fromRow(r: any): Page {
  return normalizePage({ ...r.data, id: r.id, name: r.name, slug: r.slug, published: r.published, publishedAt: r.published_at, updatedAt: new Date(r.updated_at).getTime() });
}
const toData = (p: Page) => ({ theme: p.theme, settings: p.settings, blocks: p.blocks });

const cloudStore: Store = {
  mode: 'cloud',
  async list() {
    const { data, error } = await supabaseBrowser().from('pages').select('*').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(fromRow);
  },
  async get(id) {
    const { data, error } = await supabaseBrowser().from('pages').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
  },
  async create(page) {
    const { data, error } = await supabaseBrowser().from('pages').insert({ name: page.name, data: toData(page) }).select('*').single();
    if (error) throw new Error(error.message);
    return fromRow(data);
  },
  async save(page) {
    const { error } = await supabaseBrowser().from('pages').update({ name: page.name, data: toData(page), updated_at: new Date().toISOString() }).eq('id', page.id);
    if (error) throw new Error(error.message);
  },
  async remove(id) {
    const { error } = await supabaseBrowser().from('pages').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
  async publish(page, slug) {
    if (!SLUG_RE.test(slug) || RESERVED.has(slug)) return { ok: false, error: 'Use 2–48 letters, numbers or dashes, like dapur-mak-long.' };
    const sb = supabaseBrowser();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return { ok: false, error: 'Please log in again.' };
    if (page.slug && page.slug !== slug) await sb.from('published_pages').delete().eq('page_id', page.id);
    const { error } = await sb.from('published_pages').upsert(
      { slug, page_id: page.id, owner_id: user.user.id, name: page.name, data: toData(page), published_at: new Date().toISOString() },
      { onConflict: 'page_id' },
    );
    if (error) {
      if (error.code === '23505') return { ok: false, error: `“${slug}” is already taken. Try another link.` };
      return { ok: false, error: error.message };
    }
    await sb.from('pages').update({ slug, published: true, published_at: new Date().toISOString() }).eq('id', page.id);
    return { ok: true, slug };
  },
  async unpublish(page) {
    const sb = supabaseBrowser();
    await sb.from('published_pages').delete().eq('page_id', page.id);
    await sb.from('pages').update({ published: false }).eq('id', page.id);
  },
  async uploadImage(blob) {
    const sb = supabaseBrowser();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) throw new Error('Please log in again.');
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const path = `${user.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
    if (error) throw new Error(error.message);
    return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
  },
  async orders() {
    const { data, error } = await supabaseBrowser().from('orders').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({ id: r.id, slug: r.slug, createdAt: r.created_at, total: Number(r.total), items: r.items, shipping: r.shipping, customer: r.customer }));
  },
};

export const store: Store = hasSupabase ? cloudStore : demoStore;

/** Shrink photos before saving so pages stay light and fast. */
export async function shrinkImage(file: File, max = 1600): Promise<Blob> {
  if (!/^image\//.test(file.type)) throw new Error('That file is not a photo. Try a JPG or PNG.');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not read that photo.'))), type, 0.85));
}
