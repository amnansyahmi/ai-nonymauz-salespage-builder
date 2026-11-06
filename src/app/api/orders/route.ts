/* Prices and eligibility are checked against the published catalog inside a transactional RPC. */
import { NextResponse } from "next/server";
import { placeOrder } from "@/lib/server/data";
import { pgCode } from "@/lib/server/db";
export async function POST(req: Request) {
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { ok: false, error: "not configured" },
      { status: 503 },
    );
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    return NextResponse.json(
      { ok: false, error: "invalid origin" },
      { status: 403 },
    );
  if (Number(req.headers.get("content-length") || 0) > 20000)
    return NextResponse.json(
      { ok: false, error: "request too large" },
      { status: 413 },
    );
  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  if (
    !/^[a-z0-9-]{1,48}$/.test(b?.slug || "") ||
    !Array.isArray(b?.quantities) ||
    b.quantities.length > 100 ||
    !/^[a-f0-9-]{36}$/i.test(b?.requestId || "") ||
    typeof b.formId !== "string"
  )
    return NextResponse.json(
      { ok: false, error: "invalid checkout" },
      { status: 400 },
    );
  // PDPA: buyer details are stored only with an explicit opt-in (the RPC checks this too).
  if (b.customer?.consent !== true)
    return NextResponse.json(
      { ok: false, error: "consent required" },
      { status: 400 },
    );
  try {
    const id = await placeOrder({
      slug: b.slug,
      formId: b.formId,
      quantities: b.quantities,
      shippingIndex: Number.isInteger(b.shippingIndex) ? b.shippingIndex : 0,
      customer: b.customer || {},
      requestId: b.requestId,
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const invalid = pgCode(e) === "22023";
    if (!invalid) console.error("place_order failed", e);
    return NextResponse.json(
      {
        ok: false,
        error: invalid
          ? "Check your selected items and customer details."
          : "Could not record this enquiry.",
      },
      { status: invalid ? 400 : 503 },
    );
  }
}
