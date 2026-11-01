const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
let loaded;
function engine() {
  if (loaded) return loaded;
  const ctx = { window: { SP_SERVER: true }, Map, Set, console };
  vm.createContext(ctx);
  for (const name of [
    "core",
    "blocks",
    "templates",
    "page-css",
    "looks-css",
    "studio-page-css",
    "runtime",
    "store",
    "export",
  ]) {
    let source = fs.readFileSync(
      path.join(process.cwd(), "js", name + ".js"),
      "utf8",
    );
    vm.runInContext(source, ctx, { timeout: 1000 });
  }
  loaded = ctx.window.SP;
  return loaded;
}
function validate(raw) {
  if (
    !raw ||
    typeof raw !== "object" ||
    !Array.isArray(raw.blocks) ||
    raw.blocks.length > 100 ||
    !raw.theme ||
    !raw.settings
  )
    throw Object.assign(new Error("Invalid page document."), { status: 400 });
  if (Buffer.byteLength(JSON.stringify(raw)) > 3000000)
    throw Object.assign(
      new Error(
        "This page is too large for cloud publishing. Use smaller photos or export HTML.",
      ),
      { status: 413 },
    );
  const SP = engine(),
    p = SP.normalizePage(JSON.parse(JSON.stringify(raw)));
  // Drop arbitrary imported properties: only known fields and supported metadata cross the server boundary.
  p.settings = Object.fromEntries(
    [
      "businessName",
      "whatsapp",
      "lang",
      "waFloat",
      "sticky",
      "stickyText",
      "stickyLink",
      "seoTitle",
      "seoDesc",
      "pixelId",
      "spacing",
      "captureOrders",
      "reviewsConfirmed",
    ].map((k) => [k, p.settings[k]]),
  );
  p.blocks.forEach((b) => {
    const allowed = Object.keys(SP.blocks[b.type].defaults()).concat([
      "focusX",
      "focusY",
      "variants",
      "askSchedule",
    ]);
    b.props = Object.fromEntries(
      Object.entries(b.props).filter(([k]) => allowed.includes(k)),
    );
  });
  return p;
}
function publishable(page) {
  const SP = engine();
  if (!SP.validWa(page.settings.whatsapp))
    throw Object.assign(
      new Error("Add a valid WhatsApp destination before publishing."),
      { status: 400 },
    );
  const blocks = page.blocks.filter((b) => !b.hidden),
    order = blocks.find((b) => b.type === "order");
  if (!order || !order.props.items.length)
    throw Object.assign(
      new Error("Add at least one product to a visible order form."),
      { status: 400 },
    );
  const anchors = new Set(blocks.map((b) => b.anchor).filter(Boolean));
  anchors.add("order");
  for (const b of blocks) {
    if (!b.props.btnText) continue;
    const link = b.props.btnLink || "#order";
    if (
      SP.safeLink(link, "#invalid") === "#invalid" ||
      (link[0] === "#" && !anchors.has(link.slice(1)))
    )
      throw Object.assign(
        new Error("Fix the button destinations before publishing."),
        { status: 400 },
      );
  }
}
function render(page, options) {
  return engine().exportHTML(page, options);
}
module.exports = { engine, validate, publishable, render };
