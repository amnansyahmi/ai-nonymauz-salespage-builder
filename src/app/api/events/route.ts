import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/server/data";
export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false }, { status: 503 });
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
    try {
      await trackEvent(b.slug, b.event);
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ ok: false }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
