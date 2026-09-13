import { authenticate, login, logout } from "./auth";
import { assertAllowedOrigin, corsHeaders } from "./cors";
import {
  createAddress, createDriver, createRecord, deleteAddress, deleteDriver, deleteRecord, getRecord,
  listAddresses, listDrivers, listRecords, updateAddress, updateDriver, updateRecord,
} from "./db";
import { exportCsv, importRows } from "./routes/import-export";
import type { Env } from "./types";
import { ApiError, errorResponse, json, readJson } from "./utils/http";

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  if (method === "GET" && path === "/api/health") {
    return json({ status: "ok", database: "bound", time: Date.now() });
  }
  if (method === "POST" && path === "/api/auth/login") return json(await login(request, env));

  const session = await authenticate(request, env);
  if (method === "POST" && path === "/api/auth/logout") {
    await logout(request, env);
    return json({ loggedOut: true });
  }
  if (method === "GET" && path === "/api/auth/me") {
    return json({ user: { name: session.userName }, expiresAt: session.expiresAt });
  }

  if (method === "GET" && path === "/api/records") return json(await listRecords(env));
  if (method === "POST" && path === "/api/records") {
    return json(await createRecord(env, await readJson(request), session.userName), 201);
  }

  const recordMatch = path.match(/^\/api\/records\/([^/]+)$/);
  if (recordMatch) {
    const id = decodeURIComponent(recordMatch[1]);
    if (method === "GET") return json(await getRecord(env, id));
    if (method === "PUT" || method === "PATCH") return json(await updateRecord(env, id, await readJson(request), session.userName));
    if (method === "DELETE") return json(await deleteRecord(env, id, session.userName));
  }

  const recordAddressMatch = path.match(/^\/api\/records\/([^/]+)\/addresses$/);
  if (recordAddressMatch) {
    const recordId = decodeURIComponent(recordAddressMatch[1]);
    if (method === "GET") return json(await listAddresses(env, recordId));
    if (method === "POST") return json(await createAddress(env, recordId, await readJson(request), session.userName), 201);
  }

  const addressMatch = path.match(/^\/api\/addresses\/([^/]+)$/);
  if (addressMatch) {
    const id = decodeURIComponent(addressMatch[1]);
    if (method === "PUT" || method === "PATCH") return json(await updateAddress(env, id, await readJson(request), session.userName));
    if (method === "DELETE") return json(await deleteAddress(env, id, session.userName));
  }

  if (path === "/api/drivers") {
    if (method === "GET") return json(await listDrivers(env));
    if (method === "POST") return json(await createDriver(env, await readJson(request), session.userName), 201);
  }
  const driverMatch = path.match(/^\/api\/drivers\/([^/]+)$/);
  if (driverMatch) {
    const id = decodeURIComponent(driverMatch[1]);
    if (method === "PUT" || method === "PATCH") return json(await updateDriver(env, id, await readJson(request), session.userName));
    if (method === "DELETE") return json(await deleteDriver(env, id, session.userName));
  }

  if (method === "POST" && path === "/api/import") return json(await importRows(request, env, session));
  if (method === "GET" && path === "/api/export.csv") return exportCsv(env);

  throw new ApiError(404, "NOT_FOUND", "Endpoint not found.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      try {
        assertAllowedOrigin(request, env);
        return new Response(null, { status: 204, headers: cors });
      } catch {
        return errorResponse(new ApiError(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed."));
      }
    }
    let response: Response;
    try {
      assertAllowedOrigin(request, env);
      response = await route(request, env);
    } catch (error) {
      if (error instanceof Error && error.message === "CORS_ORIGIN_DENIED") {
        response = errorResponse(new ApiError(403, "ORIGIN_NOT_ALLOWED", "This origin is not allowed."));
      } else {
        response = errorResponse(error);
      }
    }
    const outgoing = new Response(response.body, response);
    cors.forEach((value, key) => outgoing.headers.set(key, value));
    outgoing.headers.set("X-Content-Type-Options", "nosniff");
    outgoing.headers.set("Cache-Control", outgoing.headers.get("Cache-Control") || "no-store");
    return outgoing;
  },
} satisfies ExportedHandler<Env>;
