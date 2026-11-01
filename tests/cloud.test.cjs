const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { engine } = require("../server/render.cjs");
const workspace = require("../api/workspace.js"),
  site = require("../api/site.js"),
  events = require("../api/events.js");
function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(n) {
      this.statusCode = n;
      return this;
    },
    json(v) {
      this.body = v;
      return this;
    },
    end(v) {
      this.body = v;
    },
  };
}
function request(action, token, body, origin = "https://builder.test") {
  return {
    method: body ? "POST" : "GET",
    query: { action },
    headers: {
      authorization: "Bearer " + token,
      host: "builder.test",
      origin,
      "x-forwarded-for": "192.0.2.1",
    },
    body,
  };
}
function fakeRedis() {
  const map = new Map(),
    expiry = new Map();
  function run(c) {
    const [verb, key, ...a] = c;
    switch (verb) {
      case "GET":
        return map.get(key) || null;
      case "SET":
        if (a.includes("NX") && map.has(key)) return null;
        map.set(key, a[0]);
        if (a.includes("EX")) expiry.set(key, Number(a[a.indexOf("EX") + 1]));
        return "OK";
      case "EXISTS":
        return map.has(key) ? 1 : 0;
      case "INCR": {
        const n = Number(map.get(key) || 0) + 1;
        map.set(key, n);
        return n;
      }
      case "EXPIRE":
        expiry.set(key, Number(a[0]));
        return 1;
      case "HSET": {
        const h = map.get(key) || new Map();
        h.set(a[0], a[1]);
        map.set(key, h);
        return 1;
      }
      case "HGETALL":
        return map.get(key) ? [...map.get(key)].flat() : [];
      case "HLEN":
        return map.get(key)?.size || 0;
      case "HINCRBY": {
        const h = map.get(key) || new Map();
        h.set(a[0], Number(h.get(a[0]) || 0) + Number(a[1]));
        map.set(key, h);
        return h.get(a[0]);
      }
      case "LPUSH": {
        const l = map.get(key) || [];
        l.unshift(a[0]);
        map.set(key, l);
        return l.length;
      }
      case "LRANGE":
        return (map.get(key) || []).slice(Number(a[0]), Number(a[1]) + 1);
      case "LTRIM":
        map.set(
          key,
          (map.get(key) || []).slice(Number(a[0]), Number(a[1]) + 1),
        );
        return "OK";
      case "MGET":
        return [key, ...a].map((k) => map.get(k) || null);
      default:
        throw Error("Unexpected Redis command " + verb);
    }
  }
  return {
    map,
    expiry,
    fetch: async (url, opts) => ({
      ok: true,
      json: async () =>
        url.endsWith("/multi-exec")
          ? JSON.parse(opts.body).map((c) => ({ result: run(c) }))
          : { result: run(JSON.parse(opts.body)) },
    }),
  };
}
test("cloud publishing, tenant isolation, snapshot rollback and enquiry privacy", async () => {
  const priorFetch = global.fetch,
    priorURL = process.env.UPSTASH_REDIS_REST_URL,
    priorToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const redis = fakeRedis();
  global.fetch = redis.fetch;
  process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-only";
  const token = "a".repeat(64),
    other = "b".repeat(64),
    SP = engine(),
    page = SP.createFromTemplate("food");
  page.settings.whatsapp = "0123456789";
  page.settings.captureOrders = true;
  async function call(action, body = {}, key = token) {
    const res = response();
    await workspace(request(action, key, body), res);
    return res;
  }
  try {
    let r = await call("connect");
    assert.equal(r.statusCode, 200);
    await call("connect", {}, other);
    r = await call("publish", { page });
    assert.equal(r.statusCode, 200);
    const slug = r.body.slug;
    const publicRes = response();
    await site({ method: "GET", query: { slug } }, publicRes);
    assert.equal(publicRes.statusCode, 200);
    assert.match(publicRes.body, /<h1 class="sp-h1">Sambal Garing/);
    assert.ok(publicRes.headers["Content-Security-Policy"]);
    const cross = await call("load", { id: page.id }, other);
    assert.equal(cross.statusCode, 404);
    const releases = await call("releases", { id: page.id });
    assert.equal(releases.body.releases.length, 1);
    const release = releases.body.releases[0].id;
    page.blocks[0].props.headline = "Draft only";
    await call("save", { page });
    const draftRes = response();
    await site({ method: "GET", query: { slug } }, draftRes);
    assert.ok(!draftRes.body.includes('<h1 class="sp-h1">Draft only'));
    await call("publish", { page });
    const live = response();
    await site({ method: "GET", query: { slug } }, live);
    assert.ok(live.body.includes('<h1 class="sp-h1">Draft only'));
    await call("rollback", { id: page.id, release });
    const rollback = response();
    await site({ method: "GET", query: { slug } }, rollback);
    assert.ok(rollback.body.includes('<h1 class="sp-h1">Sambal Garing'));
    const rejected = response();
    await workspace(
      request("save", token, { page }, "https://evil.test"),
      rejected,
    );
    assert.equal(rejected.statusCode, 403);
    const event = {
      event: "enquiry",
      slug,
      id: "test-order-123",
      form: page.blocks.find((b) => b.type === "order").id,
      consent: false,
      quantities: [1, 0, 0],
      shipping: 0,
      total: 0,
      customer: { name: "Test Buyer", phone: "0123456789" },
    };
    const denied = response();
    await events({ ...request("", token, event) }, denied);
    assert.equal(denied.statusCode, 400);
    event.consent = true;
    const accepted = response();
    await events(request("", token, event), accepted);
    assert.equal(accepted.statusCode, 200);
    const stats = await call("stats", { id: page.id });
    assert.equal(stats.body.orders.length, 1);
    assert.equal(stats.body.orders[0].total, 26);
    assert.equal(stats.body.orders[0].customer.name, "Test Buyer");
    const recordKey = [...redis.map.keys()].find((k) =>
      k.includes(":enquiry:"),
    );
    assert.equal(redis.expiry.get(recordKey), 2592000);
    await events(request("", token, event), response());
    assert.equal((await call("stats", { id: page.id })).body.orders.length, 1);
    redis.map.delete(recordKey);
    assert.equal((await call("stats", { id: page.id })).body.orders.length, 0);
    const invalid = SP.clone(page);
    invalid.settings.whatsapp = "1";
    assert.equal((await call("publish", { page: invalid })).statusCode, 400);
  } finally {
    global.fetch = priorFetch;
    if (priorURL === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = priorURL;
    if (priorToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = priorToken;
  }
});
test("cloud configuration is explicit and never pretends to publish locally", async () => {
  const res = response();
  await workspace(request("status", ""), res);
  assert.equal(res.body.configured, false);
});
test("AI drafting validates input and rejects malformed responses", async () => {
  const { draft } = require("../server/copy.cjs");
  await assert.rejects(
    draft({ product: "" }, async () => ({ text: "{}" })),
    /product name/,
  );
  await assert.rejects(
    draft({ product: "Test", benefit: "Made fresh" }, async () => ({
      text: "not json",
    })),
    /incomplete/,
  );
  const r = await draft(
    { product: "Test", benefit: "Made fresh", lang: "ms" },
    async (args) => {
      assert.ok(!args.prompt.includes("phone"));
      return {
        text: '{"headline":"Dibuat segar","sub":"Disediakan selepas tempahan.","benefits":["Dibuat segar"]}',
      };
    },
  );
  assert.equal(r.headline, "Dibuat segar");
});
