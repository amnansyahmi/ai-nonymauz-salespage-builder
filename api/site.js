const store = require("../server/storage.cjs"),
  { render } = require("../server/render.cjs");
module.exports = async function (req, res) {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      return res.end("Method not allowed");
    }
    const slug = String(req.query.slug || "");
    if (!/^[a-z0-9-]{8,90}$/.test(slug)) {
      res.statusCode = 404;
      return res.end("Page not found");
    }
    const pub = await store.get(store.key("public", slug));
    if (!pub) {
      res.statusCode = 404;
      return res.end("Page not found");
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'unsafe-inline' https://connect.facebook.net; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https: data:; connect-src 'self' https://www.facebook.com; frame-src https://www.youtube-nocookie.com; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
    );
    const html = render(pub.page, {
      tracking: { slug, revision: pub.at },
      captureOrders: !!pub.page.settings.captureOrders,
    });
    res.end(req.method === "HEAD" ? "" : html);
  } catch (e) {
    res.statusCode = e.status || 503;
    res.end("This page is temporarily unavailable. Please try again.");
  }
};
