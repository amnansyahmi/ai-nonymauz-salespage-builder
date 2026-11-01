import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("Supabase migration: atomic publication, RLS, catalog pricing, offline retention and rollback", async () => {
  const db = new PGlite();
  const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    pageId = "11111111-1111-4111-8111-111111111111",
    secondId = "22222222-2222-4222-8222-222222222222";
  const document = {
    theme: {},
    settings: { whatsapp: "0123456789" },
    blocks: [
      {
        id: "order-one",
        type: "order",
        props: {
          items: [
            { name: "Bottle", price: 18 },
            { name: "Combo", price: 90 },
          ],
          shipping: [
            { label: "Delivery", fee: 8 },
            { label: "Pickup", fee: 0, pickup: true },
          ],
          freeShipMin: 90,
          askAddress: true,
          variants: "Original, Extra spicy",
        },
      },
    ],
  };
  const customer = {
    name: "Test Buyer",
    phone: "0123456789",
    address: "Test address",
    variant: "Extra spicy",
  };
  async function asUser(id: string) {
    await db.exec("reset role;set role authenticated;");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  }
  async function admin() {
    await db.exec("reset role;");
  }
  async function publish(id = pageId, name = "Version A", slug = "test-shop") {
    return db.query("select public.publish_page($1::uuid,$2,$3,$4::jsonb)", [
      id,
      slug,
      name,
      JSON.stringify(document),
    ]);
  }
  async function order(
    q: number[],
    ship = 0,
    c: unknown = customer,
    id = "33333333-3333-4333-8333-333333333333",
  ) {
    return db.query<{ id: string }>(
      "select public.place_order($1,$2,$3::jsonb,$4,$5::jsonb,$6::uuid) as id",
      [
        "test-shop",
        "order-one",
        JSON.stringify(q),
        ship,
        JSON.stringify(c),
        id,
      ],
    );
  }
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create schema storage;create table storage.buckets(id text primary key,name text,public boolean);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;`,
    );
    await db.exec(readFileSync("supabase/schema.sql", "utf8"));
    await db.exec(
      readFileSync("supabase/migrations/20261101_seller_studio.sql", "utf8"),
    ); // rerun is safe
    await db.exec(
      "grant usage on schema public,auth,storage to anon,authenticated;grant select,insert,update,delete on public.pages,public.published_pages,public.orders to anon,authenticated;",
    );
    await db.query("insert into auth.users(id) values($1),($2)", [
      owner,
      other,
    ]);
    await db.query(
      "insert into public.pages(id,owner_id,name,data) values($1,$2,$3,$4::jsonb),($5,$2,$6,$4::jsonb)",
      [
        pageId,
        owner,
        "Draft A",
        JSON.stringify(document),
        secondId,
        "Second draft",
      ],
    );
    await asUser(owner);
    await publish();
    const release = (
      await db.query<{ id: string }>(
        "select id from public.page_releases where page_id=$1",
        [pageId],
      )
    ).rows[0].id;
    await assert.rejects(publish(secondId, "Collision"), /duplicate key/);
    assert.equal(
      (
        await db.query(
          "select slug from public.published_pages where page_id=$1",
          [pageId],
        )
      ).rows.length,
      1,
    );
    await asUser(other);
    assert.equal((await db.query("select * from public.pages")).rows.length, 0);
    await assert.rejects(publish(), /permission denied|insufficient_privilege/);
    await admin();
    await db.exec("set role anon;");
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    const first = (await order([2, 0])).rows[0].id;
    assert.equal((await order([2, 0])).rows[0].id, first); // idempotent retry
    await assert.rejects(
      db.query(
        "insert into public.orders(slug,owner_id,items,total,customer) values('test-shop',$1,'[]',0,'{}')",
        [owner],
      ),
      /row-level security/,
    );
    await assert.rejects(
      order([1, 0], 99, customer, "77777777-7777-4777-8777-777777777777"),
      /Invalid delivery/,
    );
    await assert.rejects(
      order(
        [1, 0],
        0,
        { ...customer, address: "" },
        "88888888-8888-4888-8888-888888888888",
      ),
      "delivery requires address",
    );
    await order(
      [1, 0],
      1,
      { ...customer, address: "" },
      "44444444-4444-4444-8444-444444444444",
    );
    await order([0, 1], 0, customer, "55555555-5555-4555-8555-555555555555");
    await db.query("select public.track_page_event('test-shop','visit')");
    await asUser(owner);
    const orders = (
      await db.query<{ total: string; request_id: string }>(
        "select total,request_id from public.orders order by total",
      )
    ).rows;
    assert.deepEqual(
      orders.map((o) => Number(o.total)),
      [18, 44, 90],
    );
    assert.equal(
      (
        await db.query<{ visits: number }>(
          "select visits from public.page_activity",
        )
      ).rows[0].visits,
      1,
    );
    await db.query("select public.unpublish_page($1::uuid)", [pageId]);
    assert.equal(
      (await db.query("select * from public.orders")).rows.length,
      3,
    );
    await admin();
    await db.exec("set role anon;");
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    assert.equal(
      (
        await db.query(
          "select * from public.published_pages where slug='test-shop'",
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      order([1, 0], 0, customer, "66666666-6666-4666-8666-666666666666"),
      /not live/,
    );
    await asUser(owner);
    await publish(pageId, "Version B");
    await db.query(
      "update public.pages set name='Private draft C' where id=$1",
      [pageId],
    );
    await db.query("select public.rollback_page($1::uuid,$2::uuid)", [
      pageId,
      release,
    ]);
    assert.equal(
      (
        await db.query<{ name: string }>(
          "select name from public.pages where id=$1",
          [pageId],
        )
      ).rows[0].name,
      "Private draft C",
    );
    assert.equal(
      (
        await db.query<{ name: string }>(
          "select name from public.published_pages where slug='test-shop'",
        )
      ).rows[0].name,
      "Version A",
    );
    await assert.rejects(
      publish(pageId, "Rename", "different-link"),
      /must stay the same/,
    );
  } finally {
    await db.close();
  }
});
