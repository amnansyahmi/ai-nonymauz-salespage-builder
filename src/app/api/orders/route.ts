/* Prices and eligibility are checked against the published catalog inside a transactional RPC. */
import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/supabase/env";
import { supabasePublic } from "@/lib/supabase/server";
export async function POST(req: Request) {
  if (!hasSupabase)
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
  const { data, error } = await supabasePublic().rpc("place_order", {
    p_slug: b.slug,
    p_form_id: b.formId,
    p_quantities: b.quantities,
    p_shipping_index: b.shippingIndex || 0,
    p_customer: b.customer || {},
    p_request_id: b.requestId,
  });
  if (error)
    return NextResponse.json(
      {
        ok: false,
        error:
          error.code === "PGRST202"
            ? "Checkout database setup needs updating."
            : error.code === "22023"
              ? "Check your selected items and customer details."
              : "Could not record this enquiry.",
      },
      { status: error.code === "22023" ? 400 : 503 },
    );
  return NextResponse.json({ ok: true, id: data });
}
