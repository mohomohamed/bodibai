import type { Env } from "./types";

export function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (origin && allowed.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

export function assertAllowedOrigin(request: Request, env: Env): void {
  const origin = request.headers.get("Origin");
  if (!origin) return;
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim());
  if (!allowed.includes(origin)) throw new Error("CORS_ORIGIN_DENIED");
}
