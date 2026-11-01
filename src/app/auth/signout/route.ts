import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { hasSupabase } from '@/lib/supabase/env';

export async function POST(req: Request) {
  if (hasSupabase) await (await supabaseServer()).auth.signOut();
  return NextResponse.redirect(new URL('/login', req.url), { status: 303 });
}
