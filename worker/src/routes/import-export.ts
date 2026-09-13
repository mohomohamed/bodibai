import type { Env } from "../types";
import type { Session } from "../types";
import { createAddress, createRecord, getRecord, listRecords, updateRecord } from "../db";
import { ApiError, readJson, text } from "../utils/http";

type ImportRow = Record<string, unknown>;

export async function importRows(request: Request, env: Env, session: Session) {
  const body = await readJson<{ rows?: unknown }>(request, 1_500_000);
  if (!Array.isArray(body.rows)) throw new ApiError(400, "INVALID_REQUEST", "Rows must be an array.");
  if (body.rows.length > 2_000) throw new ApiError(400, "IMPORT_LIMIT", "Import up to 2,000 rows at a time.");

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const failed: { row: number; message: string }[] = [];

  for (let index = 0; index < body.rows.length; index += 1) {
    const raw = body.rows[index];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      failed.push({ row: index + 2, message: "Row is not an object." });
      continue;
    }
    const row = raw as ImportRow;
    if (!text(row.name, 200)) {
      skipped += 1;
      failed.push({ row: index + 2, message: "Name is required." });
      continue;
    }
    try {
      let record: Awaited<ReturnType<typeof createRecord>>;
      const requestedId = text(row.id, 80);
      let exists = false;
      if (requestedId) {
        try {
          await getRecord(env, requestedId);
          exists = true;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404) throw error;
        }
      }
      if (exists && requestedId) {
        record = await updateRecord(env, requestedId, row, session.userName);
        updated += 1;
      } else {
        record = await createRecord(env, row, session.userName);
        imported += 1;
      }

      const hasAddress = [row.addressLine1, row.addressLine2, row.islandCity, row.atollRegion]
        .some((value) => Boolean(text(value, 300)));
      if (hasAddress && !record.addresses.length) {
        await createAddress(env, record.id, {
          label: row.addressLabel || "Primary",
          addressLine1: row.addressLine1,
          addressLine2: row.addressLine2,
          islandCity: row.islandCity,
          atollRegion: row.atollRegion,
          country: row.country || "Maldives",
          addressNotes: row.addressNotes,
          isPrimary: true,
        }, session.userName);
      }
    } catch (error) {
      failed.push({ row: index + 2, message: error instanceof ApiError ? error.message : "Could not import this row." });
    }
  }
  return { imported, updated, skipped, failed: failed.length, errors: failed };
}

function safeCell(value: unknown): string {
  let textValue = value === undefined || value === null ? "" : String(value);
  if (/^[=+\-@]/.test(textValue)) textValue = `'${textValue}`;
  return `"${textValue.replace(/"/g, '""')}"`;
}

export async function exportCsv(env: Env): Promise<Response> {
  const records = await listRecords(env);
  const header = [
    "id", "name", "phone", "email", "category", "group_name", "area", "portions", "delivery_status",
    "status", "notes", "address_label", "address_line_1", "address_line_2", "island_city", "atoll_region",
    "country", "address_notes", "updated_at", "updated_by",
  ];
  const rows: unknown[][] = [header];
  for (const record of records) {
    const addresses = record.addresses.length ? record.addresses : [null];
    for (const address of addresses) {
      rows.push([
        record.id, record.name, record.phone, record.email, record.category, record.groupName, record.area,
        record.portions, record.deliveryStatus, record.status, record.notes, address?.label, address?.addressLine1,
        address?.addressLine2, address?.islandCity, address?.atollRegion, address?.country, address?.notes,
        new Date(record.updatedAt).toISOString(), record.updatedBy,
      ]);
    }
  }
  const csv = `\uFEFF${rows.map((row) => row.map(safeCell).join(",")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bondibai-records-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
