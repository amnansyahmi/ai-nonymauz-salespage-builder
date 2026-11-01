const store = require("../server/storage.cjs");
module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
    store.sameOrigin(req);
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (
      !["visit", "cta", "whatsapp", "enquiry"].includes(body.event) ||
      !/^[a-z0-9-]{8,90}$/.test(body.slug || "")
    )
      return res.status(400).json({ error: "Invalid event." });
    const pub = await store.get(store.key("public", body.slug));
    if (!pub) return res.status(404).json({ error: "Page not found." });
    const ip = String(
      req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
    ).split(",")[0];
    await store.rate(
      "event:" + body.slug + ":" + store.hash(ip).slice(0, 20),
      120,
      60,
    );
    const commands = [];
    if (body.event === "enquiry") {
      if (!pub.page.settings.captureOrders || body.consent !== true)
        return res
          .status(400)
          .json({ error: "Enquiry capture is not enabled." });
      const key = String(body.id || "");
      if (!/^[a-zA-Z0-9_-]{8,80}$/.test(key))
        return res.status(400).json({ error: "Invalid enquiry ID." });
      const order = pub.page.blocks.find(
        (b) => !b.hidden && b.type === "order" && b.id === body.form,
      );
      if (!order)
        return res.status(400).json({ error: "Order form not found." });
      const items = order.props.items
        .map((it, i) => ({
          name: String(it.name).slice(0, 200),
          price: Number(it.price) || 0,
          quantity: Math.max(
            0,
            Math.min(999, Math.trunc(Number(body.quantities?.[i]) || 0)),
          ),
        }))
        .filter((it) => it.quantity);
      if (!items.length)
        return res.status(400).json({ error: "Choose an item." });
      const customer = {};
      for (const field of [
        "name",
        "phone",
        "address",
        "note",
        "variant",
        "date",
        "time",
      ])
        customer[field] = String(body.customer?.[field] || "").slice(
          0,
          field === "address" || field === "note" ? 1000 : 200,
        );
      if (
        !customer.name ||
        !/^[+()\d\s-]{8,25}$/.test(customer.phone) ||
        !/^\d{8,15}$/.test(customer.phone.replace(/\D/g, ""))
      )
        return res.status(400).json({ error: "Invalid customer details." });
      const subtotal = items.reduce((n, it) => n + it.price * it.quantity, 0),
        shipping = (order.props.shipping || [])[
          Math.max(0, Math.trunc(Number(body.shipping) || 0))
        ],
        fee =
          order.props.freeShipMin && subtotal >= order.props.freeShipMin
            ? 0
            : Number(shipping?.fee) || 0;
      const enquiry = {
        id: key,
        at: Date.now(),
        customer,
        items,
        total: Math.round((subtotal + fee) * 100) / 100,
        shipping: shipping?.label || "",
      };
      commands.push(
        [
          "SET",
          store.key("enquiry", pub.owner, pub.pageId, key),
          JSON.stringify(enquiry),
          "EX",
          2592000,
        ],
        ["LPUSH", store.key("orders", pub.owner, pub.pageId), key],
        ["LTRIM", store.key("orders", pub.owner, pub.pageId), 0, 99],
        ["EXPIRE", store.key("orders", pub.owner, pub.pageId), 2592000],
      );
    } else
      commands.push([
        "HINCRBY",
        store.key("stats", pub.owner, pub.pageId),
        body.event,
        1,
      ]);
    await store.transaction(commands);
    res.json({ recorded: true });
  } catch (e) {
    store.fail(res, e);
  }
};
