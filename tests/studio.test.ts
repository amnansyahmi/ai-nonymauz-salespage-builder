import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTemplate } from "../src/lib/templates";
import { normalizePage, pageFacts } from "../src/lib/page";
import { safeLink, safeImage, validWhatsApp } from "../src/lib/format";
import { launchChecks } from "../src/lib/launch";
import {
  checkoutState,
  validPhone,
  validAppointment,
} from "../src/lib/checkout";
import { SaveQueue } from "../src/lib/save-queue";

test("readiness rejects short WhatsApp numbers and hidden order forms", () => {
  const p = buildTemplate("food");
  p.settings.whatsapp = "1";
  assert.equal(pageFacts(p).wa, "");
  p.settings.whatsapp = "0123456789";
  assert.equal(pageFacts(p).wa, "60123456789");
  p.blocks.find((b) => b.type === "order")!.hidden = true;
  assert.equal(pageFacts(p).hasOrder, false);
  assert.equal(validWhatsApp("+44 7700 900123"), true);
});
test("unsafe destinations and image data cannot become navigation", () => {
  for (const v of ["javascript:void(0)", "data:text/html,hi", "//evil.test"])
    assert.equal(safeLink(v), "#order");
  assert.equal(safeLink("#benefits"), "#benefits");
  assert.equal(safeImage("data:image/svg+xml,<svg/>"), "");
});
test("import normalization preserves photos and bounds prices and stars", () => {
  const p = buildTemplate("food");
  const photo = "data:image/png;base64," + "A".repeat(20000);
  p.blocks[0].props.image = photo;
  p.blocks.find((b) => b.type === "order")!.props.items[0].price = -100;
  p.blocks.find((b) => b.type === "testimonials")!.props.items[0].stars =
    "Infinity";
  const n = normalizePage(p);
  assert.equal(n.blocks[0].props.image, photo);
  assert.equal(
    n.blocks.find((b) => b.type === "order")!.props.items[0].price,
    0,
  );
  assert.equal(
    n.blocks.find((b) => b.type === "testimonials")!.props.items[0].stars,
    0,
  );
});
test("launch checks detect broken and hidden anchor targets", () => {
  const p = buildTemplate("food");
  p.settings.whatsapp = "0123456789";
  p.blocks[0].props.btnLink = "#missing";
  assert.equal(launchChecks(p).find((c) => c.key === "links")!.ok, false);
  p.blocks[1].anchor = "missing";
  assert.equal(launchChecks(p).find((c) => c.key === "links")!.ok, true);
  p.blocks[1].hidden = true;
  assert.equal(launchChecks(p).find((c) => c.key === "links")!.ok, false);
});
test("checkout totals include delivery, free threshold and valid pickup", () => {
  const p = buildTemplate("food").blocks.find((b) => b.type === "order")!.props;
  assert.equal(checkoutState(p, [2, 0, 0], 0).total, 44);
  assert.equal(checkoutState(p, [0, 0, 1], 0).total, 90);
  assert.equal(checkoutState(p, [-5, 0, 0], 0).q[0], 0);
  assert.equal(checkoutState(p, [1.8, 0, 0], 0).q[0], 1);
});
test("customer phone and appointment checks reject malformed or past data", () => {
  assert.equal(validPhone("--------"), false);
  assert.equal(validPhone("0123456789"), true);
  assert.equal(validAppointment("2000-01-01", "10:00"), false);
  assert.equal(
    validAppointment("2029-01-01", "10:00", Date.parse("2028-01-01")),
    true,
  );
});
test("save queue captures snapshots and serializes slow writes", async () => {
  const writes: string[] = [],
    p = { name: "first" };
  let release!: () => void;
  const wait = new Promise<void>((r) => (release = r));
  const queue = new SaveQueue<typeof p>(async (value) => {
    if (value.name === "first") await wait;
    writes.push(value.name);
  });
  const first = queue.save(p);
  p.name = "second";
  const second = queue.save(p);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(writes, []);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(writes, ["first", "second"]);
});
test("a failed save does not poison subsequent queued writes", async () => {
  const queue = new SaveQueue<{ n: number }>(async (p) => {
    if (p.n === 1) throw new Error("offline");
  });
  await assert.rejects(queue.save({ n: 1 }));
  await queue.save({ n: 2 });
});
