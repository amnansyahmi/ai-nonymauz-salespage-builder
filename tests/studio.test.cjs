const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { app, tick } = require("./helpers.cjs");
test("URLs reject script protocols and images reject SVG HTML payloads", async () => {
  const { dom, SP } = app();
  await SP.store.ready;
  for (const x of [
    "javascript:alert(1)",
    "data:text/html,<script>",
    "//evil.test",
    " JAVASCRIPT:void(0)",
  ])
    assert.equal(SP.safeLink(x), "#order");
  assert.equal(SP.safeLink("https://shop.test/p"), "https://shop.test/p");
  assert.equal(SP.safeLink("#benefits"), "#benefits");
  assert.equal(SP.safeImage("data:image/svg+xml,<svg/>"), "");
  dom.window.close();
});
test("WhatsApp readiness rejects invalid short and Malaysian numbers", async () => {
  const { dom, SP } = app();
  await SP.store.ready;
  assert.equal(SP.validWa("1"), false);
  assert.equal(SP.validWa("012"), false);
  assert.equal(SP.validWa("012-345 6789"), true);
  assert.equal(SP.validWa("+60 11 1234 5678"), true);
  assert.equal(SP.validWa("+44 7700 900123"), true);
  dom.window.close();
});
test("untrusted backup input is normalized before rendering", async () => {
  const { dom, SP } = app();
  await SP.store.ready;
  const p = SP.createFromTemplate("food");
  p.blocks[0].id = 'bad" onclick="';
  p.blocks[0].props.btnLink = "javascript:alert(1)";
  p.blocks.find((b) => b.type === "order").props.items[0].price = -100;
  p.theme.primary = "red;}body{display:none}";
  const normalized = SP.normalizePage(p),
    html = SP.exportHTML(normalized);
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes("price&quot;:-100"));
  assert.match(normalized.blocks[0].id, /^[\w-]+$/);
  assert.ok(!html.includes("red;}body"));
  dom.window.close();
});
test("hidden sections are excluded from export and section anchors survive", async () => {
  const { dom, SP } = app();
  await SP.store.ready;
  const p = SP.createFromTemplate("food");
  p.blocks[0].hidden = true;
  const section = p.blocks.find((b) => b.type === "benefits");
  section.anchor = "benefits";
  const html = SP.exportHTML(p);
  assert.ok(!html.includes('<h1 class="sp-h1">Sambal Garing'));
  assert.ok(html.includes('id="benefits"'));
  assert.ok(SP.renderPage(p, { editor: true }).includes("Sambal Garing"));
  dom.window.close();
});
test("preview and standalone exports omit cloud tracking and consent unless hosted", async () => {
  const { dom, SP } = app();
  await SP.store.ready;
  const p = SP.createFromTemplate("food");
  p.settings.pixelId = "123456";
  const html = SP.exportHTML(p, { preview: true });
  assert.ok(!html.includes("fbq('init'"));
  assert.ok(!html.includes("window.SP_TRACKING="));
  assert.ok(!html.includes('<input name="consent"'));
  const hosted = SP.exportHTML(p, {
    tracking: { slug: "public-page" },
    captureOrders: true,
  });
  assert.ok(hosted.includes("window.SP_TRACKING="));
  assert.ok(hosted.includes('name="consent"'));
  dom.window.close();
});
test("restore modes replace, copy and skip duplicates and count actual results", async () => {
  const { dom, SP } = app();
  await SP.store.ready;
  const p = SP.createFromTemplate("food");
  await SP.store.put(p);
  const incoming = SP.clone(p);
  incoming.name = "From backup";
  const backup = { app: "nonymauz", version: 1, pages: [incoming] };
  let r = await SP.store.restoreBackup(backup, "skip");
  assert.equal(r.skipped, 1);
  assert.equal(SP.store.get(p.id).name, p.name);
  r = await SP.store.restoreBackup(backup, "replace");
  assert.equal(r.restored, 1);
  assert.equal(SP.store.get(p.id).name, "From backup");
  r = await SP.store.restoreBackup(backup, "copy");
  assert.equal(r.restored, 1);
  assert.equal(SP.store.all().length, 2);
  await assert.rejects(SP.store.restoreBackup({ pages: [] }, "copy"));
  dom.window.close();
});
test("a failed durable write does not replace the saved-page cache", async () => {
  const { dom, w, SP } = app();
  await SP.store.ready;
  const p = SP.createFromTemplate("food");
  await SP.store.put(p);
  const proto = Object.getPrototypeOf(w.localStorage),
    set = proto.setItem;
  proto.setItem = function () {
    throw new Error("quota");
  };
  p.name = "Must not look saved";
  assert.equal(await SP.store.put(p), false);
  assert.notEqual(SP.store.get(p.id).name, p.name);
  proto.setItem = set;
  dom.window.close();
});
test("IndexedDB deduplicates photos and keeps recoverable versions", async () => {
  const { dom, w, SP } = app({ idb: true });
  await SP.store.ready;
  assert.equal(SP.store.mode, "indexeddb");
  const p = SP.createFromTemplate("food");
  p.blocks[0].props.image = "data:image/png;base64,aGVsbG8=";
  await SP.store.put(p);
  p.name = "Second version";
  await SP.store.put(p);
  assert.equal(SP.store.images().length, 1);
  const versions = await SP.store.versions(p.id);
  assert.equal(versions.length, 2);
  assert.equal((await SP.store.recover(versions[1])).name, "Sambal Garing");
  assert.equal(
    SP.store.get(p.id).blocks[0].props.image,
    p.blocks[0].props.image,
  );
  const req = w.indexedDB.open("nonymauz-studio", 1);
  const db = await new Promise((r) => (req.onsuccess = () => r(req.result)));
  const get = db.transaction("pages").objectStore("pages").get(p.id);
  const packed = await new Promise(
    (r) => (get.onsuccess = () => r(get.result)),
  );
  assert.match(packed.blocks[0].props.image, /^asset:/);
  db.close();
  dom.window.close();
});
test("navigating home immediately after typing saves the latest edit", async () => {
  const { dom, w, SP } = app({ editor: true });
  await SP.store.ready;
  await tick();
  const p = SP.createFromTemplate("food");
  await SP.store.put(p);
  w.location.hash = "edit-" + p.id;
  await tick(50);
  const input = w.document.querySelector("#page-name");
  input.value = "Saved immediately";
  input.dispatchEvent(new w.Event("input", { bubbles: true }));
  w.location.hash = "";
  await tick(80);
  assert.equal(SP.store.get(p.id).name, "Saved immediately");
  assert.ok(w.document.querySelector(".v-home"));
  dom.window.close();
});
test("switching themes applies alternative background before and after reload", async () => {
  const { dom, w, SP } = app({ editor: true });
  await SP.store.ready;
  await tick();
  const p = SP.createFromTemplate("blank");
  await SP.store.put(p);
  w.location.hash = "edit-" + p.id;
  await tick(40);
  w.document.querySelector('[title="Langit"]').click();
  await tick(500);
  assert.equal(SP.store.get(p.id).theme.alt, SP.themes.langit.alt);
  assert.equal(
    w.document.querySelector(".sp-page").style.getPropertyValue("--alt"),
    SP.themes.langit.alt,
  );
  dom.window.close();
});
test("guided setup uses supplied facts and strips sample claims and reviews", async () => {
  const { dom, w, SP } = app({ editor: true });
  await SP.store.ready;
  await tick();
  SP.openSetup("food");
  const form = w.document.querySelector("#setup-form");
  for (const [key, value] of Object.entries({
    business: "Test shop",
    product: "Test product",
    benefit: "Made to order",
    whatsapp: "0123456789",
  }))
    form.elements[key].value = value;
  form.dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  await tick(80);
  const p = SP.store.all()[0],
    text = JSON.stringify(p);
  assert.ok(p);
  assert.ok(text.includes("Made to order"));
  assert.ok(!text.includes("Tiada pengawet"));
  assert.ok(!text.includes("Kak Ana"));
  assert.ok(!text.includes("SSM:"));
  dom.window.close();
});
test("normalization preserves full-size uploaded image data", async () => {
  const { dom, SP } = app();
  await SP.store.ready;
  const p = SP.createFromTemplate("food"),
    photo = "data:image/png;base64," + "A".repeat(16000);
  p.blocks[0].props.image = photo;
  assert.equal(SP.normalizePage(p).blocks[0].props.image, photo);
  dom.window.close();
});
test("deleting pages frees orphaned photos while preserving shared assets", async () => {
  const { dom, SP } = app({ idb: true });
  await SP.store.ready;
  const a = SP.createFromTemplate("food");
  a.blocks[0].props.image = "data:image/png;base64,aGVsbG8=";
  const b = SP.clone(a);
  b.id = SP.uid();
  await SP.store.put(a);
  await SP.store.put(b);
  await SP.store.remove(a.id);
  assert.equal(SP.store.images().length, 1);
  assert.equal((await SP.store.versions(a.id)).length, 0);
  await SP.store.remove(b.id);
  assert.equal(SP.store.images().length, 0);
  dom.window.close();
});
test('untrusted review star counts stay bounded', async()=>{const {dom,SP}=app();await SP.store.ready;const p=SP.createFromTemplate('food');p.blocks.find(b=>b.type==='testimonials').props.items[0].stars='Infinity';const html=SP.exportHTML(p);assert.ok(html.includes('aria-label="5 / 5"'));dom.window.close();});
