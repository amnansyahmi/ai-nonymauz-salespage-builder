import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  args = process.argv.slice(2),
  at = args.indexOf("--port");
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "dev",
    "--hostname",
    "0.0.0.0",
    "--port",
    at >= 0 ? args[at + 1] : process.env.PORT || "3000",
  ],
  { stdio: "inherit", env: process.env },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
