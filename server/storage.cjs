const crypto = require("node:crypto");
const prefix = "nonymauz:v2:";
function configured() {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}
async function command(...args) {
  return (await send("", args)).result;
}
async function send(route, body) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  if (!configured())
    throw Object.assign(
      new Error("Cloud storage is not configured on this host."),
      { status: 503 },
    );
  if (!/^https:\/\/[^/?#]+\.upstash\.io\/?$/.test(url))
    throw new Error("Storage endpoint must be an Upstash HTTPS URL.");
  const r = await fetch(url.replace(/\/$/, "") + route, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.UPSTASH_REDIS_REST_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json();
  if (!r.ok || data.error) throw new Error("Cloud storage request failed.");
  return data;
}
async function transaction(commands) {
  const result = await send("/multi-exec", commands);
  if (!Array.isArray(result) || result.some((r) => r.error))
    throw new Error("Cloud save failed.");
  return result.map((r) => r.result);
}
function hash(v) {
  return crypto.createHash("sha256").update(v).digest("hex");
}
async function rate(scope, limit, seconds) {
  const key =
    prefix + "rate:" + scope + ":" + Math.floor(Date.now() / (seconds * 1000));
  const result = await transaction([
    ["INCR", key],
    ["EXPIRE", key, seconds * 2],
  ]);
  if (Number(result[0]) > limit)
    throw Object.assign(
      new Error("Too many requests. Please try again later."),
      { status: 429 },
    );
}
function key(...parts) {
  return prefix + parts.join(":");
}
async function get(k) {
  const v = await command("GET", k);
  return v ? JSON.parse(v) : null;
}
function origin(req) {
  const host = String(
    req.headers["x-forwarded-host"] || req.headers.host || "",
  );
  return "https://" + host;
}
function sameOrigin(req) {
  if (
    req.headers.origin &&
    new URL(req.headers.origin).host !==
      String(req.headers["x-forwarded-host"] || req.headers.host)
  )
    throw Object.assign(new Error("This request must come from the builder."), {
      status: 403,
    });
}
function fail(res, e) {
  res
    .status(e.status || 500)
    .json({
      error: e.status
        ? e.message
        : "The cloud request could not be completed. Please try again.",
    });
}
module.exports = {
  configured,
  command,
  transaction,
  hash,
  rate,
  key,
  get,
  origin,
  sameOrigin,
  fail,
};
