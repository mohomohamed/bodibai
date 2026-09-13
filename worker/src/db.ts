import type { AddressRow, DriverRow, Env, RecordRow } from "./types";
import { ApiError, positiveInteger, publicAddress, publicDriver, publicRecord, requiredText, text, uuid } from "./utils/http";

type Input = Record<string, unknown>;

export async function listRecords(env: Env) {
  const [recordResult, addressResult] = await Promise.all([
    env.DB.prepare("SELECT * FROM records WHERE deleted_at IS NULL ORDER BY updated_at DESC").all<RecordRow>(),
    env.DB.prepare("SELECT * FROM addresses WHERE deleted_at IS NULL ORDER BY is_primary DESC, created_at ASC").all<AddressRow>(),
  ]);
  const byRecord = new Map<string, AddressRow[]>();
  for (const address of addressResult.results) {
    const list = byRecord.get(address.record_id) || [];
    list.push(address);
    byRecord.set(address.record_id, list);
  }
  return recordResult.results.map((record) => publicRecord(record, byRecord.get(record.id) || []));
}

export async function getRecord(env: Env, id: string) {
  const record = await env.DB.prepare("SELECT * FROM records WHERE id = ? AND deleted_at IS NULL")
    .bind(id)
    .first<RecordRow>();
  if (!record) throw new ApiError(404, "NOT_FOUND", "Record not found.");
  const addresses = await env.DB.prepare(
    "SELECT * FROM addresses WHERE record_id = ? AND deleted_at IS NULL ORDER BY is_primary DESC, created_at ASC",
  )
    .bind(id)
    .all<AddressRow>();
  return publicRecord(record, addresses.results);
}

function recordValues(input: Input) {
  return {
    name: requiredText(input.name, "Name", 200),
    phone: text(input.phone, 100),
    email: text(input.email, 320),
    category: text(input.category, 100),
    groupName: text(input.groupName ?? input.group_name, 100),
    area: text(input.area, 100),
    portions: positiveInteger(input.portions),
    deliveryStatus: text(input.deliveryStatus ?? input.delivery_status, 40) || "planned",
    driverId: text(input.driverId ?? input.driver_id, 80),
    status: text(input.status, 40) || "active",
    notes: text(input.notes),
  };
}

export async function createRecord(env: Env, input: Input, userName: string) {
  const id = uuid(input.id);
  const value = recordValues(input);
  const now = Date.now();
  try {
    await env.DB.prepare(
      `INSERT INTO records
       (id,name,phone,email,category,group_name,area,portions,delivery_status,driver_id,status,notes,created_at,updated_at,updated_by,version,deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,NULL)`,
    )
      .bind(
        id, value.name, value.phone, value.email, value.category, value.groupName, value.area, value.portions,
        value.deliveryStatus, value.driverId, value.status, value.notes, now, now, userName,
      )
      .run();
  } catch (error) {
    if (String(error).includes("UNIQUE")) throw new ApiError(409, "ALREADY_EXISTS", "A record with this ID already exists.");
    throw error;
  }
  return getRecord(env, id);
}

export async function updateRecord(env: Env, id: string, input: Input, userName: string) {
  const existing = await env.DB.prepare("SELECT id FROM records WHERE id = ? AND deleted_at IS NULL").bind(id).first();
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Record not found.");
  const value = recordValues(input);
  await env.DB.prepare(
    `UPDATE records SET name=?,phone=?,email=?,category=?,group_name=?,area=?,portions=?,delivery_status=?,driver_id=?,status=?,notes=?,
     updated_at=?,updated_by=?,version=version+1 WHERE id=? AND deleted_at IS NULL`,
  )
    .bind(
      value.name, value.phone, value.email, value.category, value.groupName, value.area, value.portions,
      value.deliveryStatus, value.driverId, value.status, value.notes, Date.now(), userName, id,
    )
    .run();
  return getRecord(env, id);
}

export async function deleteRecord(env: Env, id: string, userName: string) {
  const now = Date.now();
  const result = await env.DB.batch([
    env.DB.prepare("UPDATE records SET deleted_at=?,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND deleted_at IS NULL").bind(now, now, userName, id),
    env.DB.prepare("UPDATE addresses SET deleted_at=?,updated_at=?,updated_by=?,version=version+1 WHERE record_id=? AND deleted_at IS NULL").bind(now, now, userName, id),
  ]);
  if (!result[0].meta.changes) throw new ApiError(404, "NOT_FOUND", "Record not found.");
  return { id, deletedAt: now };
}

function addressValues(input: Input) {
  return {
    label: text(input.label, 100),
    line1: text(input.addressLine1 ?? input.address_line_1, 300),
    line2: text(input.addressLine2 ?? input.address_line_2, 300),
    islandCity: text(input.islandCity ?? input.island_city, 150),
    atollRegion: text(input.atollRegion ?? input.atoll_region, 150),
    country: text(input.country, 100) || "Maldives",
    notes: text(input.notes),
    primary: input.isPrimary === true || input.is_primary === 1 ? 1 : 0,
  };
}

async function getAddressRow(env: Env, id: string) {
  const row = await env.DB.prepare("SELECT * FROM addresses WHERE id=? AND deleted_at IS NULL").bind(id).first<AddressRow>();
  if (!row) throw new ApiError(404, "NOT_FOUND", "Address not found.");
  return row;
}

export async function listAddresses(env: Env, recordId: string) {
  await getRecord(env, recordId);
  const result = await env.DB.prepare("SELECT * FROM addresses WHERE record_id=? AND deleted_at IS NULL ORDER BY is_primary DESC, created_at ASC")
    .bind(recordId).all<AddressRow>();
  return result.results.map(publicAddress);
}

export async function createAddress(env: Env, recordId: string, input: Input, userName: string) {
  await getRecord(env, recordId);
  const id = uuid(input.id);
  const value = addressValues(input);
  const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM addresses WHERE record_id=? AND deleted_at IS NULL")
    .bind(recordId).first<{ count: number }>();
  const primary = value.primary || !count?.count ? 1 : 0;
  const now = Date.now();
  const statements = [];
  if (primary) statements.push(env.DB.prepare("UPDATE addresses SET is_primary=0 WHERE record_id=?").bind(recordId));
  statements.push(env.DB.prepare(
    `INSERT INTO addresses (id,record_id,label,address_line_1,address_line_2,island_city,atoll_region,country,notes,is_primary,created_at,updated_at,updated_by,version,deleted_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,NULL)`,
  ).bind(id, recordId, value.label, value.line1, value.line2, value.islandCity, value.atollRegion, value.country, value.notes, primary, now, now, userName));
  await env.DB.batch(statements);
  return publicAddress(await getAddressRow(env, id));
}

export async function updateAddress(env: Env, id: string, input: Input, userName: string) {
  const existing = await getAddressRow(env, id);
  const value = addressValues(input);
  const now = Date.now();
  const statements = [];
  if (value.primary) statements.push(env.DB.prepare("UPDATE addresses SET is_primary=0 WHERE record_id=?").bind(existing.record_id));
  statements.push(env.DB.prepare(
    `UPDATE addresses SET label=?,address_line_1=?,address_line_2=?,island_city=?,atoll_region=?,country=?,notes=?,is_primary=?,updated_at=?,updated_by=?,version=version+1
     WHERE id=? AND deleted_at IS NULL`,
  ).bind(value.label, value.line1, value.line2, value.islandCity, value.atollRegion, value.country, value.notes, value.primary, now, userName, id));
  await env.DB.batch(statements);
  return publicAddress(await getAddressRow(env, id));
}

export async function deleteAddress(env: Env, id: string, userName: string) {
  const existing = await getAddressRow(env, id);
  const now = Date.now();
  await env.DB.prepare("UPDATE addresses SET deleted_at=?,updated_at=?,updated_by=?,version=version+1 WHERE id=?")
    .bind(now, now, userName, id).run();
  if (existing.is_primary) {
    const next = await env.DB.prepare("SELECT id FROM addresses WHERE record_id=? AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1")
      .bind(existing.record_id).first<{ id: string }>();
    if (next) await env.DB.prepare("UPDATE addresses SET is_primary=1 WHERE id=?").bind(next.id).run();
  }
  return { id, deletedAt: now };
}

export async function listDrivers(env: Env) {
  const result = await env.DB.prepare("SELECT * FROM drivers WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE").all<DriverRow>();
  return result.results.map(publicDriver);
}

function driverValues(input: Input) {
  return {
    name: requiredText(input.name, "Driver name", 200),
    phone: text(input.phone, 100), vehicle: text(input.vehicle, 100), area: text(input.area, 100),
    notes: text(input.notes), active: input.active === false ? 0 : 1,
  };
}

async function getDriverRow(env: Env, id: string) {
  const row = await env.DB.prepare("SELECT * FROM drivers WHERE id=? AND deleted_at IS NULL").bind(id).first<DriverRow>();
  if (!row) throw new ApiError(404, "NOT_FOUND", "Driver not found.");
  return row;
}

export async function createDriver(env: Env, input: Input, userName: string) {
  const id = uuid(input.id), value = driverValues(input), now = Date.now();
  await env.DB.prepare(
    "INSERT INTO drivers (id,name,phone,vehicle,area,notes,active,created_at,updated_at,updated_by,version,deleted_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,NULL)",
  ).bind(id, value.name, value.phone, value.vehicle, value.area, value.notes, value.active, now, now, userName).run();
  return publicDriver(await getDriverRow(env, id));
}

export async function updateDriver(env: Env, id: string, input: Input, userName: string) {
  await getDriverRow(env, id);
  const value = driverValues(input);
  await env.DB.prepare("UPDATE drivers SET name=?,phone=?,vehicle=?,area=?,notes=?,active=?,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND deleted_at IS NULL")
    .bind(value.name, value.phone, value.vehicle, value.area, value.notes, value.active, Date.now(), userName, id).run();
  return publicDriver(await getDriverRow(env, id));
}

export async function deleteDriver(env: Env, id: string, userName: string) {
  const now = Date.now();
  const result = await env.DB.prepare("UPDATE drivers SET deleted_at=?,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND deleted_at IS NULL")
    .bind(now, now, userName, id).run();
  if (!result.meta.changes) throw new ApiError(404, "NOT_FOUND", "Driver not found.");
  await env.DB.prepare("UPDATE records SET driver_id=NULL,updated_at=?,updated_by=?,version=version+1 WHERE driver_id=? AND deleted_at IS NULL")
    .bind(now, userName, id).run();
  return { id, deletedAt: now };
}
