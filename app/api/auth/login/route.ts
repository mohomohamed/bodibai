import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, WEEK, createSessionToken } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { password } = await request.json() as { password?: string };
  const expected = process.env.APP_PASSWORD;
  const supplied = typeof password === "string" ? password : "";
  if (!expected) return NextResponse.json({ error: "App password is not configured." }, { status: 503 });
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && timingSafeEqual(a, b);
  if (!valid) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  const secret = process.env.SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: "Session security is not configured." }, { status: 503 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, await createSessionToken(secret), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: WEEK,
  });
  return response;
}
