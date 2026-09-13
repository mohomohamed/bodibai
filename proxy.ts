import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const valid = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value, process.env.SESSION_SECRET);
  if (valid) {
    if (request.nextUrl.pathname === "/login") return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }
  if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname.startsWith("/api/auth/")) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|manifest.webmanifest|sw.js).*)"],
};
