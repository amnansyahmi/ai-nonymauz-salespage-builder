import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/supabase/env";
import { supabasePublic } from "@/lib/supabase/server";
export async function POST(req: Request) {
  if (!hasSupabase) return NextResponse.json({ ok: false }, { status: 503 });
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    return NextResponse.json({ ok: false }, { status: 403 });
  try {
    const b = await req.json();
    if (
      !/^[a-z0-9-]{1,48}$/.test(b.slug || "") ||
      !["visit", "cta", "whatsapp"].includes(b.event)
    )
      return NextResponse.json({ ok: false }, { status: 400 });
    const { error } = await supabasePublic().rpc("track_page_event", {
      p_slug: b.slug,
      p_event: b.event,
    });
    return NextResponse.json({ ok: !error }, { status: error ? 503 : 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
