const fs = require("node:fs"),
  cp = require("node:child_process");
for (const folder of ["js", "server", "api", "scripts"])
  for (const name of fs.readdirSync(folder))
    if (/\.(js|cjs)$/.test(name))
      cp.execFileSync(process.execPath, ["--check", folder + "/" + name], {
        stdio: "inherit",
      });
console.log("JavaScript syntax checked.");
