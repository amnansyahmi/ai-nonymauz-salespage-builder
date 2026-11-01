import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from '@/lib/supabase/env';

const PRIVATE = ['/dashboard', '/edit', '/orders', '/preview'];

/* Keeps the Supabase session fresh and sends signed-out sellers to /login. Public pages pass straight through. */
export async function middleware(req: NextRequest) {
  if (!hasSupabase) return NextResponse.next();
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  if (!data.user && PRIVATE.some((p) => path === p || path.startsWith(p + '/'))) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/edit/:path*', '/orders/:path*', '/preview/:path*', '/login', '/auth/:path*'],
};
