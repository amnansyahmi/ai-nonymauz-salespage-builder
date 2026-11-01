const crypto = require("node:crypto"),
  store = require("../server/storage.cjs"),
  { validate, publishable, engine } = require("../server/render.cjs");
module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const action = req.query.action || "list";
    if (action === "status" && req.method === "GET")
      return res.json({
        configured: store.configured(),
        ai: require("../server/copy.cjs").configured(),
      });
    if (!["GET", "POST"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (!["list"].includes(action) && req.method !== "POST")
      return res.status(405).json({ error: "Use POST for this action." });
    store.sameOrigin(req);
    const token = String(req.headers.authorization || "").replace(
      /^Bearer /,
      "",
    );
    if (!/^[a-f0-9]{64}$/.test(token))
      return res
        .status(401)
        .json({ error: "Connect a cloud workspace first." });
    if (action === "connect") {
      const ip = String(
        req.headers["x-forwarded-for"] ||
          req.socket?.remoteAddress ||
          "unknown",
      ).split(",")[0];
      await store.rate("create:" + store.hash(ip), 20, 3600);
    }
    const owner = store.hash(token),
      workspace = store.key("workspace", owner),
      exists = await store.command("EXISTS", workspace);
    await store.rate("owner:" + owner, 120, 60);
    if (action === "connect") {
      await store.command("SET", workspace, "1", "NX");
      return res.json({ connected: true });
    }
    if (!exists)
      return res
        .status(404)
        .json({ error: "Workspace not found. Check your recovery key." });
    const body = req.body || {},
      id = String(body.id || "");
    if (id && !/^[a-zA-Z0-9_-]{1,80}$/.test(id))
      return res.status(400).json({ error: "Invalid page ID." });
    if (action === "copy") {
      const copy = require("../server/copy.cjs");
      if (!copy.configured())
        return res
          .status(503)
          .json({ error: "AI drafting is not configured on this host." });
      await store.rate("copy:" + owner, 10, 3600);
      return res.json(await copy.draft(body));
    }
    if (action === "list") {
      const all = await store.command("HGETALL", store.key("index", owner));
      let pages = [];
      for (let i = 0; i < (all || []).length; i += 2)
        pages.push(JSON.parse(all[i + 1]));
      return res.json({ pages });
    }
    if (action === "save" || action === "publish") {
      const page = validate(body.page),
        pageKey = store.key("page", owner, page.id),
        at = Date.now(),
        prior = await store.get(pageKey);
      if (
        !prior &&
        Number(await store.command("HLEN", store.key("index", owner))) >= 100
      )
        return res
          .status(400)
          .json({ error: "A workspace can hold up to 100 pages." });
      const commands = [
        ["SET", pageKey, JSON.stringify(page)],
        [
          "HSET",
          store.key("index", owner),
          page.id,
          JSON.stringify({ id: page.id, name: page.name, at }),
        ],
      ];
      if (action === "publish") {
        publishable(page);
        const slug =
            owner.slice(0, 12) +
            "-" +
            engine().slug(page.name).slice(0, 45) +
            "-" +
            page.id.slice(0, 12),
          existing = await store.get(store.key("publication", owner, page.id)),
          publicSlug = existing?.slug || slug;
        const publication = {
            owner,
            pageId: page.id,
            slug: publicSlug,
            page,
            at,
          },
          release = { id: crypto.randomUUID(), at, page };
        commands.push(
          ["SET", store.key("public", publicSlug), JSON.stringify(publication)],
          [
            "SET",
            store.key("publication", owner, page.id),
            JSON.stringify({ slug: publicSlug, at }),
          ],
          [
            "LPUSH",
            store.key("releases", owner, page.id),
            JSON.stringify(release),
          ],
          ["LTRIM", store.key("releases", owner, page.id), 0, 19],
        );
        await store.transaction(commands);
        return res.json({ slug: publicSlug, at });
      }
      await store.transaction(commands);
      return res.json({ saved: true, at });
    }
    if (!id) return res.status(400).json({ error: "A page ID is required." });
    const page = await store.get(store.key("page", owner, id));
    if (!page)
      return res
        .status(404)
        .json({ error: "Page not found in this workspace." });
    if (action === "load") return res.json({ page });
    if (action === "releases") {
      const releases = await store.command(
        "LRANGE",
        store.key("releases", owner, id),
        0,
        19,
      );
      return res.json({
        releases: (releases || []).map((v) => {
          const r = JSON.parse(v);
          return { id: r.id, at: r.at };
        }),
      });
    }
    if (action === "rollback") {
      const values = await store.command(
          "LRANGE",
          store.key("releases", owner, id),
          0,
          19,
        ),
        release = values
          .map((v) => JSON.parse(v))
          .find((v) => v.id === body.release),
        pub = await store.get(store.key("publication", owner, id));
      if (!release || !pub)
        return res.status(404).json({ error: "Published version not found." });
      const at = Date.now();
      await store.command(
        "SET",
        store.key("public", pub.slug),
        JSON.stringify({
          owner,
          pageId: id,
          slug: pub.slug,
          page: release.page,
          at,
        }),
      );
      return res.json({ restored: true, at });
    }
    if (action === "stats") {
      const raw = await store.command("HGETALL", store.key("stats", owner, id)),
        stats = {};
      for (let i = 0; i < (raw || []).length; i += 2)
        stats[raw[i]] = Number(raw[i + 1]);
      const ids = await store.command(
          "LRANGE",
          store.key("orders", owner, id),
          0,
          99,
        ),
        unique = [...new Set(ids || [])];
      const orders = unique.length
        ? await store.command(
            "MGET",
            ...unique.map((v) => store.key("enquiry", owner, id, v)),
          )
        : [];
      return res.json({
        stats,
        orders: orders.filter(Boolean).map((v) => JSON.parse(v)),
      });
    }
    res.status(400).json({ error: "Unknown workspace action." });
  } catch (e) {
    store.fail(res, e);
  }
};
