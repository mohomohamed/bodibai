import type { Env } from "./types";

export function isAllowedOrigin(origin: string, env: Env): boolean {
  if (!origin) return false;
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (allowed.includes("*")) return true;
  if (allowed.includes(origin)) return true;

  return allowed.some((pattern) => {
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1);
      try {
        const url = new URL(origin);
        return url.hostname.endsWith(suffix);
      } catch {
        return false;
      }
    }
    if (pattern.startsWith("https://*.") || pattern.startsWith("http://*.")) {
      const isHttps = pattern.startsWith("https://");
      const domainSuffix = pattern.replace(/^https?:\/\/\*\./, ".");
      try {
        const url = new URL(origin);
        if (isHttps && url.protocol !== "https:") return false;
        if (!isHttps && url.protocol !== "http:") return false;
        return url.hostname.endsWith(domainSuffix);
      } catch {
        return false;
      }
    }
    return false;
  });
}

export function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin");
  if (origin && isAllowedOrigin(origin, env)) {
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
  if (!isAllowedOrigin(origin, env)) {
    throw new Error("CORS_ORIGIN_DENIED");
  }
}

