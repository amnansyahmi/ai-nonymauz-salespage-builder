const fs = require("node:fs");
fs.mkdirSync("dist", { recursive: true });
for (const name of ["index.html", "css", "js"])
  fs.cpSync(name, "dist/" + name, { recursive: true });
console.log("Static frontend built in dist/. Server functions remain in api/.");
