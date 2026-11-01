/* Records an order placed on a published page. Buyers are anonymous; row-level security only allows
   inserting into a page that is actually published, under that page's owner. */
import { NextResponse } from 'next/server';
import { hasSupabase } from '@/lib/supabase/env';
import { supabasePublic } from '@/lib/supabase/server';

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export async function POST(req: Request) {
  if (!hasSupabase) return NextResponse.json({ ok: false, error: 'not configured' }, { status: 503 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }); }

  const slug = str(body?.slug, 48);
  if (!/^[a-z0-9-]{1,48}$/.test(slug)) return NextResponse.json({ ok: false, error: 'bad slug' }, { status: 400 });
  const items = Array.isArray(body?.items) ? body.items.slice(0, 50).map((it: any) => ({
    name: str(it?.name, 120), price: Math.max(0, Number(it?.price) || 0), qty: Math.max(0, Math.min(999, Math.floor(Number(it?.qty) || 0))),
  })).filter((it: any) => it.qty > 0) : [];
  if (!items.length) return NextResponse.json({ ok: false, error: 'no items' }, { status: 400 });

  const sb = supabasePublic();
  const { data: page } = await sb.from('published_pages').select('owner_id').eq('slug', slug).maybeSingle();
  if (!page) return NextResponse.json({ ok: false, error: 'page not found' }, { status: 404 });

  const shipping = body?.shipping ? { label: str(body.shipping.label, 120), fee: Math.max(0, Number(body.shipping.fee) || 0) } : null;
  const total = items.reduce((s: number, it: any) => s + it.price * it.qty, 0) + (shipping?.fee || 0);
  const c = body?.customer || {};
  const customer = { name: str(c.name, 120), phone: str(c.phone, 40), address: str(c.address, 500), note: str(c.note, 500) };
  if (!customer.name || !customer.phone) return NextResponse.json({ ok: false, error: 'missing details' }, { status: 400 });

  const { error } = await sb.from('orders').insert({ slug, owner_id: page.owner_id, items, shipping, total, customer });
  if (error) return NextResponse.json({ ok: false, error: 'could not save' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
