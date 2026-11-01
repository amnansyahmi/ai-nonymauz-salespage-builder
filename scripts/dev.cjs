const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const portArg = process.argv.indexOf("--port"),
  port = process.env.PORT || (portArg >= 0 ? process.argv[portArg + 1] : 3000);
const root = path.resolve(__dirname, ".."),
  types = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".png": "image/png",
    ".json": "application/json",
  };
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    req.query = Object.fromEntries(url.searchParams);
    res.status = function (n) {
      res.statusCode = n;
      return res;
    };
    res.json = function (v) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(v));
    };
    res.send = function (v) {
      res.end(v);
    };
    const route = url.pathname.startsWith("/p/")
      ? "site"
      : url.pathname.startsWith("/api/")
        ? url.pathname.slice(5)
        : null;
    if (route) {
      try {
        if (url.pathname.startsWith("/p/"))
          req.query.slug = decodeURIComponent(url.pathname.slice(3));
        let chunks = [];
        for await (const c of req) {
          chunks.push(c);
          if (Buffer.concat(chunks).length > 3500000)
            throw new Error("Request too large");
        }
        if (chunks.length) req.body = JSON.parse(Buffer.concat(chunks));
        await require("../api/" + route + ".js")(req, res);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
      return;
    }
    const file = path.resolve(
      root,
      "." + (url.pathname === "/" ? "/index.html" : url.pathname),
    );
    if (
      !file.startsWith(root + path.sep) ||
      ![".html", ".css", ".js", ".png"].includes(path.extname(file)) ||
      /\/(?:api|server|tests|scripts)\//.test(file)
    ) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
      res.setHeader(
        "Content-Type",
        types[path.extname(file)] || "application/octet-stream",
      );
      res.end(data);
    });
  })
  .listen(port, "0.0.0.0", () =>
    console.log("Local: http://localhost:" + port),
  );
