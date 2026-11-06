/* Every query runs inside one short transaction as one of two database roles:
   "anon" for buyers and visitors, "authenticated" for a signed-in seller (auth.uid() = their id).
   Row-level security and the RPCs in db/schema.sql then decide what the request may read or change. */
import { neon } from "@neondatabase/serverless";

export type Role = "anon" | "authenticated";
export type Exec = (
  role: Role,
  uid: string | null,
  text: string,
  params: unknown[],
) => Promise<Record<string, any>[]>;

let exec: Exec | null = null;

/** Tests swap in a local Postgres. */
export function setExecutor(e: Exec | null) {
  exec = e;
}

function neonExec(): Exec {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = neon(url);
  return async (role, uid, text, params) => {
    const results = await sql.transaction([
      sql.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? ""]),
      sql.query(role === "authenticated" ? "set local role authenticated" : "set local role anon"),
      sql.query(text, params),
    ]);
    return results[2] as Record<string, any>[];
  };
}

export function run(role: Role, uid: string | null, text: string, params: unknown[] = []) {
  if (role === "authenticated" && !uid) throw Object.assign(new Error("Not signed in"), { code: "42501" });
  return (exec ??= neonExec())(role, uid, text, params);
}

/** Database errors carry a Postgres code (e.g. 23505 duplicate, 22023 invalid input, 42501 not allowed). */
export const pgCode = (e: unknown) => (e as { code?: string })?.code || "";
export const pgMessage = (e: unknown) => (e as Error)?.message || "Something went wrong.";
