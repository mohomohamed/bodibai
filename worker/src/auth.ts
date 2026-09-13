import type { Env, Session } from "./types";
import { ApiError, readJson, requiredText } from "./utils/http";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sameSecret(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(left), sha256(right)]);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function login(request: Request, env: Env) {
  const body = await readJson<{ name?: unknown; password?: unknown }>(request, 8_000);
  const userName = requiredText(body.name, "Name", 80);
  const password = typeof body.password === "string" ? body.password : "";
  if (!env.APP_PASSWORD || !(await sameSecret(password, env.APP_PASSWORD))) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect password.");
  }

  const now = Date.now();
  const token = randomToken();
  await env.DB.prepare(
    "INSERT INTO sessions (id, token_hash, user_name, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID(), await sha256(token), userName, now, now + SESSION_DURATION_MS, now)
    .run();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now).run();
  return { token, user: { name: userName }, expiresAt: now + SESSION_DURATION_MS };
}

function bearer(request: Request): string {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) throw new ApiError(401, "UNAUTHORIZED", "Please sign in.");
  const token = header.slice(7).trim();
  if (!token) throw new ApiError(401, "UNAUTHORIZED", "Please sign in.");
  return token;
}

export async function authenticate(request: Request, env: Env): Promise<Session> {
  const tokenHash = await sha256(bearer(request));
  const now = Date.now();
  const row = await env.DB.prepare(
    "SELECT id, user_name, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?",
  )
    .bind(tokenHash, now)
    .first<{ id: string; user_name: string; expires_at: number }>();
  if (!row) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ? OR expires_at <= ?").bind(tokenHash, now).run();
    throw new ApiError(401, "SESSION_EXPIRED", "Your session has expired. Please sign in again.");
  }
  await env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").bind(now, row.id).run();
  return { id: row.id, userName: row.user_name, expiresAt: row.expires_at };
}

export async function logout(request: Request, env: Env): Promise<void> {
  const tokenHash = await sha256(bearer(request));
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}
