import { NextResponse, type NextRequest } from "next/server";
import { auth, authConfigured } from "@/lib/auth/server";

/* Keeps the Neon Auth session fresh and sends signed-out sellers to /login.
   Only the studio is matched; published salespages and checkout never pass through here. */
export default async function proxy(req: NextRequest) {
  if (!authConfigured()) return NextResponse.next();
  return auth().middleware({ loginUrl: "/login" })(req);
}

export const config = {
  matcher: ["/dashboard/:path*", "/edit/:path*", "/orders/:path*", "/preview/:path*"],
};
