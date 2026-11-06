/* Forwards sign-in, sign-out, email links and Google callbacks to Neon Auth. */
import { auth, authConfigured } from "@/lib/auth/server";

type Ctx = { params: Promise<{ path: string[] }> };
const off = () => Response.json({ error: "Accounts are not set up." }, { status: 503 });
const forward =
  (method: "GET" | "POST") =>
  (req: Request, ctx: Ctx) =>
    authConfigured() ? (auth().handler()[method] as (r: Request, c: Ctx) => Promise<Response>)(req, ctx) : off();

export const GET = forward("GET");
export const POST = forward("POST");
