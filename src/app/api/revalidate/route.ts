/* Refreshes the cached copy of a published page right after its owner publishes, takes it offline or restores a version.
   Only the signed-in owner can trigger it: the page is read through row-level security. */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  if (!hasSupabase) return NextResponse.json({ ok: false }, { status: 503 });
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    return NextResponse.json({ ok: false }, { status: 403 });
  let pageId = "";
  try {
    pageId = String((await req.json())?.pageId || "");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(pageId))
    return NextResponse.json({ ok: false }, { status: 400 });
  const sb = await supabaseServer();
  const { data } = await sb.from("pages").select("slug").eq("id", pageId).maybeSingle();
  if (!data?.slug) return NextResponse.json({ ok: false }, { status: 404 });
  revalidatePath("/" + data.slug);
  return NextResponse.json({ ok: true });
}
