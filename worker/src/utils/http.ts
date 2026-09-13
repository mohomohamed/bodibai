import type { AddressRow, DriverRow, RecordRow } from "../types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({ ok: false, error: { code: error.code, message: error.message } }),
      { status: error.status, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }
  console.error("Unhandled API error", error);
  return new Response(
    JSON.stringify({ ok: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong." } }),
    { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}

export async function readJson<T>(request: Request, maxBytes = 64_000): Promise<T> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new ApiError(413, "REQUEST_TOO_LARGE", "The request is too large.");
  const body = await request.text();
  if (new TextEncoder().encode(body).length > maxBytes) {
    throw new ApiError(413, "REQUEST_TOO_LARGE", "The request is too large.");
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request body must be valid JSON.");
  }
}

export function text(value: unknown, max = 5000): string | null {
  if (value === undefined || value === null) return null;
  const result = String(value).trim();
  return result ? result.slice(0, max) : null;
}

export function requiredText(value: unknown, label: string, max = 200): string {
  const result = text(value, max);
  if (!result) throw new ApiError(400, "INVALID_REQUEST", `${label} is required.`);
  return result;
}

export function positiveInteger(value: unknown, fallback = 1): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(100_000, Math.round(parsed))) : fallback;
}

export function publicRecord(row: RecordRow, addresses: AddressRow[] = []) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    category: row.category ?? "",
    groupName: row.group_name ?? "",
    area: row.area ?? "",
    portions: row.portions,
    deliveryStatus: row.delivery_status,
    driverId: row.driver_id ?? "",
    status: row.status,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? "",
    version: row.version,
    deletedAt: row.deleted_at,
    addresses: addresses.map(publicAddress),
  };
}

export function publicAddress(row: AddressRow) {
  return {
    id: row.id,
    recordId: row.record_id,
    label: row.label ?? "",
    addressLine1: row.address_line_1 ?? "",
    addressLine2: row.address_line_2 ?? "",
    islandCity: row.island_city ?? "",
    atollRegion: row.atoll_region ?? "",
    country: row.country ?? "Maldives",
    notes: row.notes ?? "",
    isPrimary: Boolean(row.is_primary),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? "",
    version: row.version,
    deletedAt: row.deleted_at,
  };
}

export function publicDriver(row: DriverRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    vehicle: row.vehicle ?? "",
    area: row.area ?? "",
    notes: row.notes ?? "",
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? "",
    version: row.version,
    deletedAt: row.deleted_at,
  };
}

export function uuid(value: unknown): string {
  const candidate = text(value, 80);
  if (!candidate) return crypto.randomUUID();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{5,79}$/.test(candidate)) {
    throw new ApiError(400, "INVALID_REQUEST", "Invalid ID.");
  }
  return candidate;
}
