import "server-only";
import { createNeonAuth } from "@neon/auth/next/server";

/* Neon Auth: sellers' accounts live in the same Neon database (neon_auth."user"). Created on first use so
   demo mode (no Neon settings) still builds and runs. */
let instance: ReturnType<typeof createNeonAuth> | null = null;
export function auth() {
  return (instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL || "",
    // "lax" so the session survives arriving from an email link or the Google sign-in page.
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET || "", sameSite: "lax" },
  }));
}

export const authConfigured = () =>
  !!process.env.NEON_AUTH_BASE_URL && (process.env.NEON_AUTH_COOKIE_SECRET || "").length >= 32;

/** The signed-in seller's id, or null. */
export async function sellerId(): Promise<string | null> {
  if (!authConfigured()) return null;
  try {
    const { data } = await auth().getSession();
    const id = data?.user?.id;
    return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  } catch {
    return null;
  }
}
