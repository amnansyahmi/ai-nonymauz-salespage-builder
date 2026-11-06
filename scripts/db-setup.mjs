/* Applies db/schema.sql to the Neon database in DATABASE_URL. Safe to re-run.
   Usage: DATABASE_URL=postgresql://... npm run db:setup  (or put it in .env.local) */
import { readFileSync, existsSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL && existsSync(".env.local"))
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^DATABASE_URL=(.*)$/);
    if (m) process.env.DATABASE_URL = m[1].trim();
  }
if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL to your Neon connection string first.");
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("Database schema is up to date.");
} catch (e) {
  console.error("Could not apply the schema:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
