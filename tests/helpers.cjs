const fs = require("node:fs"),
  { JSDOM } = require("jsdom"),
  { IDBFactory } = require("fake-indexeddb");
function app({
  editor = false,
  idb = false,
  html = '<!doctype html><div id="app"></div>',
} = {}) {
  const dom = new JSDOM(html, {
    url: "https://builder.test/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false });
  w.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.TextEncoder = TextEncoder;
  w.AbortSignal = AbortSignal;
  w.fetch = async () => ({
    ok: true,
    json: async () => ({ configured: false }),
  });
  if (idb) Object.defineProperty(w, "indexedDB", { value: new IDBFactory() });
  const names = [
    "core",
    "blocks",
    "page-css",
    "looks-css",
    "studio-page-css",
    "runtime",
    "templates",
    "store",
    "export",
    "studio",
  ].concat(editor ? ["editor"] : []);
  for (const n of names) w.eval(fs.readFileSync("js/" + n + ".js", "utf8"));
  return { dom, w, SP: w.SP };
}
async function tick(ms = 0) {
  await new Promise((r) => setTimeout(r, ms));
}
module.exports = { app, tick };
