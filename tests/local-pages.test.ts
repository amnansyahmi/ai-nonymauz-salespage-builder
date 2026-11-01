import { test } from "node:test";
import assert from "node:assert/strict";
import { indexedDB } from "fake-indexeddb";
import { buildTemplate } from "../src/lib/templates";
import {
  localPages,
  journalPage,
  pendingPage,
  clearJournal,
} from "../src/lib/local-pages";
const values = new Map<string, string>();
Object.defineProperty(globalThis, "indexedDB", { value: indexedDB });
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  },
});

test("device saves isolate owners, deduplicate image assets, recover snapshots and serialize writes", async () => {
  const p = buildTemplate("food");
  p.id = "device-test";
  const image = "data:image/png;base64,iVBORw0KGgo=";
  p.blocks[0].props.image = image;
  await Promise.all([
    localPages.save("alice", p),
    localPages.save("alice", { ...p, name: "Latest draft" }),
    localPages.save("bob", { ...p, name: "Other owner" }),
  ]);
  assert.equal((await localPages.list("alice"))[0].name, "Latest draft");
  assert.equal((await localPages.list("bob"))[0].name, "Other owner");
  assert.equal(
    (await localPages.list("alice"))[0].blocks[0].props.image,
    image,
  );
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("nonymauz-next-studio", 1);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  const assets = await new Promise<number>((resolve) => {
    const r = db.transaction("assets").objectStore("assets").count();
    r.onsuccess = () => resolve(r.result);
  });
  assert.equal(assets, 1);
  db.close();
  assert.equal(
    (await localPages.versions("alice", p.id))[0].page.blocks[0].props.image,
    image,
  );
  assert.equal((await localPages.versions("charlie", p.id)).length, 0);
  assert.ok(journalPage("alice", p));
  assert.equal(pendingPage("bob", p.id), null);
  assert.equal(pendingPage("alice", p.id)?.name, p.name);
  clearJournal("alice", { ...p, name: "Older snapshot" });
  assert.ok(pendingPage("alice", p.id));
  clearJournal("alice", p);
  assert.equal(pendingPage("alice", p.id), null);
  await localPages.remove("alice", p.id);
  assert.equal((await localPages.list("alice")).length, 0);
  assert.equal((await localPages.versions("alice", p.id)).length, 0);
  assert.equal((await localPages.list("bob")).length, 1);
});

test("backup restore keeps copies separate, reports failures, and supports skip or replace", async () => {
  const { store, restoreBackup } = await import("../src/lib/store");
  const original = await store.create({
    ...buildTemplate("food"),
    name: "Original",
    slug: "stable-shop",
    published: true,
  });
  const backup = {
    app: "nonymauz",
    version: 2,
    pages: [{ ...original, name: "Recovered" }],
  };
  assert.deepEqual(await restoreBackup(backup, "skip"), {
    restored: 0,
    skipped: 1,
    failed: 0,
  });
  assert.equal((await store.get(original.id))?.name, "Original");
  assert.deepEqual(await restoreBackup(backup, "copy"), {
    restored: 1,
    skipped: 0,
    failed: 0,
  });
  const copy = (await store.list()).find((p) => p.id !== original.id)!;
  assert.equal(copy.slug, null);
  assert.equal(copy.published, false);
  assert.deepEqual(
    await restoreBackup(
      { ...backup, pages: [...backup.pages, null] },
      "replace",
    ),
    { restored: 1, skipped: 0, failed: 1 },
  );
  const replaced = await store.get(original.id);
  assert.equal(replaced?.name, "Recovered");
  assert.equal(replaced?.slug, "stable-shop");
  assert.equal(replaced?.published, true);
  await assert.rejects(
    restoreBackup({ pages: [] }, "copy"),
    /valid Nonymauz backup/,
  );
});
