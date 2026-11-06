/* All database reads and writes, by who is asking. Seller functions take the signed-in seller's id. */
import { run } from "./db";

const PAGE_COLS = "id,name,data,slug,published,published_at,updated_at";

export const pages = {
  list: (uid: string) =>
    run("authenticated", uid, `select ${PAGE_COLS} from public.pages order by updated_at desc`),
  async get(uid: string, id: string) {
    const rows = await run("authenticated", uid, `select ${PAGE_COLS} from public.pages where id=$1`, [id]);
    return rows[0] || null;
  },
  async create(uid: string, name: string, data: unknown) {
    const rows = await run(
      "authenticated",
      uid,
      `insert into public.pages(owner_id,name,data) values($1,$2,$3::jsonb) returning ${PAGE_COLS}`,
      [uid, name, JSON.stringify(data)],
    );
    return rows[0];
  },
  async save(uid: string, id: string, name: string, data: unknown) {
    const rows = await run(
      "authenticated",
      uid,
      "update public.pages set name=$2,data=$3::jsonb,updated_at=now() where id=$1 returning id",
      [id, name, JSON.stringify(data)],
    );
    return rows.length > 0;
  },
  remove: (uid: string, id: string) =>
    run("authenticated", uid, "delete from public.pages where id=$1", [id]),
  publish: (uid: string, id: string, slug: string, name: string, data: unknown) =>
    run("authenticated", uid, "select public.publish_page($1::uuid,$2,$3,$4::jsonb) as slug", [
      id,
      slug,
      name,
      JSON.stringify(data),
    ]),
  unpublish: (uid: string, id: string) =>
    run("authenticated", uid, "select public.unpublish_page($1::uuid)", [id]),
  rollback: (uid: string, id: string, release: string) =>
    run("authenticated", uid, "select public.rollback_page($1::uuid,$2::uuid)", [id, release]),
  releases: (uid: string, id: string) =>
    run(
      "authenticated",
      uid,
      "select id,name,data,created_at from public.page_releases where page_id=$1 order by created_at desc limit 20",
      [id],
    ),
  activity: (uid: string, id: string) =>
    run(
      "authenticated",
      uid,
      "select visits::int,cta::int,whatsapp::int from public.page_activity where page_id=$1",
      [id],
    ),
  async slugOf(uid: string, id: string) {
    const rows = await run("authenticated", uid, "select slug from public.pages where id=$1", [id]);
    return (rows[0]?.slug as string | null) || null;
  },
};

export const orders = {
  list: (uid: string) =>
    run(
      "authenticated",
      uid,
      "select id,slug,created_at,total,items,shipping,customer from public.orders order by created_at desc limit 200",
    ),
};

export async function claimAiDraft(uid: string, limit = 10) {
  const rows = await run("authenticated", uid, "select public.claim_ai_draft($1) as ok", [limit]);
  return !!rows[0]?.ok;
}

/* ---------- visitors and buyers ---------- */
export async function livePage(slug: string) {
  const rows = await run(
    "anon",
    null,
    "select slug,name,data,published_at from public.published_pages where slug=$1 and active",
    [slug],
  );
  return rows[0] || null;
}

export async function placeOrder(o: {
  slug: string;
  formId: string;
  quantities: unknown[];
  shippingIndex: number;
  customer: unknown;
  requestId: string;
}) {
  const rows = await run(
    "anon",
    null,
    "select public.place_order($1,$2,$3::jsonb,$4,$5::jsonb,$6::uuid) as id",
    [o.slug, o.formId, JSON.stringify(o.quantities), o.shippingIndex, JSON.stringify(o.customer), o.requestId],
  );
  return rows[0]?.id as string;
}

export const trackEvent = (slug: string, event: string) =>
  run("anon", null, "select public.track_page_event($1,$2)", [slug, event]);
