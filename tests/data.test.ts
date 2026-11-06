import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { setExecutor } from "../src/lib/server/db";
import { livePage, orders, pages, placeOrder, trackEvent, claimAiDraft } from "../src/lib/server/data";

test("Server data layer: each request runs as its seller or as a visitor", async () => {
  const db = new PGlite();
  const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await db.exec(`create schema neon_auth;create table neon_auth."user"(id uuid primary key);`);
  await db.exec(readFileSync("db/schema.sql", "utf8"));
  await db.query('insert into neon_auth."user"(id) values($1),($2)', [a, b]);
  // Same steps as the Neon executor: set the seller id, switch role, run, all in one transaction.
  setExecutor((role, uid, text, params) =>
    db.transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid ?? ""]);
      await tx.exec(role === "authenticated" ? "set local role authenticated" : "set local role anon");
      return (await tx.query<Record<string, any>>(text, params)).rows;
    }),
  );
  const data = {
    theme: {},
    settings: { whatsapp: "60123456789" },
    blocks: [{ id: "f1", type: "order", props: { items: [{ name: "Sambal", price: 15 }] } }],
  };
  try {
    const page = await pages.create(a, "Sambal", data);
    assert.equal((await pages.list(a)).length, 1);
    assert.equal((await pages.list(b)).length, 0, "another seller sees nothing");
    assert.equal(await pages.get(b, page.id), null);
    assert.equal(await pages.save(b, page.id, "Hacked", data), false, "another seller cannot save");
    await pages.remove(b, page.id);
    assert.equal((await pages.list(a)).length, 1, "another seller cannot delete");
    assert.equal(await pages.save(a, page.id, "Sambal Mak Long", data), true);
    await assert.rejects(pages.publish(b, page.id, "sambal", "x", data), /permission|insufficient/);
    await pages.publish(a, page.id, "sambal", "Sambal Mak Long", data);
    assert.equal((await livePage("sambal"))?.name, "Sambal Mak Long");

    const id = await placeOrder({
      slug: "sambal",
      formId: "f1",
      quantities: [2],
      shippingIndex: 0,
      customer: { name: "Buyer", phone: "0123456789", consent: true },
      requestId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    assert.ok(id);
    const mine = await orders.list(a);
    assert.equal(mine.length, 1);
    assert.equal(Number(mine[0].total), 30, "total is recalculated from the published price");
    assert.equal((await orders.list(b)).length, 0, "another seller cannot read the orders");

    await trackEvent("sambal", "visit");
    assert.equal((await pages.activity(a, page.id))[0].visits, 1);
    assert.equal((await pages.releases(a, page.id)).length, 1);
    assert.equal((await pages.releases(b, page.id)).length, 0);

    await pages.unpublish(a, page.id);
    assert.equal(await livePage("sambal"), null, "offline pages are not served");
    assert.equal(await claimAiDraft(a, 1), true);
    assert.equal(await claimAiDraft(a, 1), false);
  } finally {
    setExecutor(null);
    await db.close();
  }
});
