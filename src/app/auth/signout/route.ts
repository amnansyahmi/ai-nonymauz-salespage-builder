import { NextResponse } from "next/server";
import { auth, authConfigured } from "@/lib/auth/server";

export async function POST(req: Request) {
  if (authConfigured()) {
    try {
      await auth().signOut();
    } catch {
      /* the session cookie is cleared either way below */
    }
  }
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
