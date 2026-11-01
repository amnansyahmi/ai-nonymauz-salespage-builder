const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { app } = require("./helpers.cjs");
async function checkout(options = {}) {
  const env = app();
  await env.SP.store.ready;
  const p = env.SP.createFromTemplate("food");
  p.settings.whatsapp = "0123456789";
  p.settings.lang = options.lang || "ms";
  const ob = p.blocks.find((b) => b.type === "order");
  Object.assign(ob.props, options);
  ob.props.shipping = ob.props.shipping.map((s) => ({
    ...s,
    pickup: /Ambil sendiri/.test(s.label),
  }));
  env.w.document.body.innerHTML = env.SP.renderPage(p, { editor: true });
  env.w.SP_initPage(env.w.document);
  const form = env.w.document.querySelector(".sp-order");
  return { ...env, p, form };
}
function set(env, name, value) {
  const el = env.form.querySelector('[name="' + name + '"]');
  el.value = value;
  el.dispatchEvent(new env.w.Event("input", { bubbles: true }));
}
function submit(env) {
  env.form.dispatchEvent(
    new env.w.Event("submit", { bubbles: true, cancelable: true }),
  );
}
test("quantity and delivery changes calculate totals, including free shipping", async () => {
  const e = await checkout();
  const inputs = e.form.querySelectorAll(".sp-qty input");
  assert.equal(e.form.querySelector("[data-o=total]").textContent, "RM26");
  inputs[0].value = 0;
  inputs[2].value = 1;
  inputs[2].dispatchEvent(new e.w.Event("input", { bubbles: true }));
  assert.equal(e.form.querySelector("[data-o=ship]").textContent, "PERCUMA");
  assert.equal(e.form.querySelector("[data-o=total]").textContent, "RM90");
  inputs[2].value = -10;
  inputs[2].dispatchEvent(new e.w.Event("input", { bubbles: true }));
  assert.equal(inputs[2].value, "0");
  e.dom.window.close();
});
test("pickup hides delivery address and does not require it", async () => {
  const e = await checkout();
  const radios = e.form.querySelectorAll(".sp-ship input");
  radios[2].checked = true;
  radios[2].dispatchEvent(new e.w.Event("change", { bubbles: true }));
  assert.equal(
    e.form.querySelector("[name=address]").closest("label").hidden,
    true,
  );
  set(e, "name", "Test Buyer");
  set(e, "phone", "0123456789");
  submit(e);
  assert.equal(e.form.querySelector(".sp-err").hidden, true);
  assert.match(e.form.querySelector(".sp-demo pre").textContent, /RM18/);
  e.dom.window.close();
});
test("checkout rejects empty basket and malformed customer phone", async () => {
  const e = await checkout();
  set(e, "name", "Test Buyer");
  set(e, "phone", "abc");
  set(e, "address", "Test address");
  submit(e);
  assert.equal(e.form.querySelector(".sp-err").hidden, false);
  assert.match(e.form.querySelector(".sp-err").textContent, /telefon/);
  e.form.querySelectorAll(".sp-qty input").forEach((i) => (i.value = 0));
  submit(e);
  assert.match(e.form.querySelector(".sp-err").textContent, /1 item/);
  e.dom.window.close();
});
test("variants and appointment details appear in the WhatsApp message", async () => {
  const e = await checkout({
    variants: "Original,Extra spicy",
    askSchedule: true,
    askAddress: false,
    lang: "en",
  });
  set(e, "name", "Test Buyer");
  set(e, "phone", "0123456789");
  set(e, "date", "2029-01-02");
  set(e, "time", "10:30");
  set(e, "variant", "Extra spicy");
  submit(e);
  const message = e.form.querySelector(".sp-demo pre").textContent;
  assert.match(message, /Variant: Extra spicy/);
  assert.match(message, /Preferred date: 2029-01-02 10:30/);
  assert.ok(e.form.querySelector('[aria-label="Increase quantity"]'));
  e.dom.window.close();
});
test("scheduled enquiries reject past dates", async () => {
  const e = await checkout({
    askSchedule: true,
    askAddress: false,
    lang: "en",
  });
  set(e, "name", "Test Buyer");
  set(e, "phone", "0123456789");
  set(e, "date", "2000-01-01");
  set(e, "time", "10:30");
  submit(e);
  assert.match(e.form.querySelector(".sp-err").textContent, /future date/);
  e.dom.window.close();
});
