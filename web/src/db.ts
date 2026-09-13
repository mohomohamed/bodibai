import { openDB, type DBSchema } from "idb";
import type { Address, Driver, PendingMutation, RecordItem } from "./types";

type CachedRecord = Omit<RecordItem, "addresses">;

interface BondibaiDB extends DBSchema {
  records: { key: string; value: CachedRecord; indexes: { "by-updated": number } };
  addresses: { key: string; value: Address; indexes: { "by-record": string; "by-updated": number } };
  drivers: { key: string; value: Driver; indexes: { "by-name": string } };
  pendingMutations: { key: string; value: PendingMutation; indexes: { "by-created": number } };
  settings: { key: string; value: unknown };
}

const database = openDB<BondibaiDB>("bondibai-list", 1, {
  upgrade(db) {
    const records = db.createObjectStore("records", { keyPath: "id" });
    records.createIndex("by-updated", "updatedAt");
    const addresses = db.createObjectStore("addresses", { keyPath: "id" });
    addresses.createIndex("by-record", "recordId");
    addresses.createIndex("by-updated", "updatedAt");
    const drivers = db.createObjectStore("drivers", { keyPath: "id" });
    drivers.createIndex("by-name", "name");
    const pending = db.createObjectStore("pendingMutations", { keyPath: "id" });
    pending.createIndex("by-created", "createdAt");
    db.createObjectStore("settings");
  },
});

export async function saveSetting<T>(key: string, value: T): Promise<void> {
  await (await database).put("settings", value, key);
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await database).get("settings", key) as Promise<T | undefined>;
}

export async function removeSetting(key: string): Promise<void> {
  await (await database).delete("settings", key);
}

export async function cacheServerSnapshot(records: RecordItem[], drivers: Driver[]): Promise<void> {
  const db = await database;
  const transaction = db.transaction(["records", "addresses", "drivers"], "readwrite");
  await Promise.all([transaction.objectStore("records").clear(), transaction.objectStore("addresses").clear(), transaction.objectStore("drivers").clear()]);
  for (const record of records) {
    const { addresses, ...core } = record;
    await transaction.objectStore("records").put(core);
    for (const address of addresses) await transaction.objectStore("addresses").put(address);
  }
  for (const driver of drivers) await transaction.objectStore("drivers").put(driver);
  await transaction.done;
}

export async function loadCachedSnapshot(): Promise<{ records: RecordItem[]; drivers: Driver[] }> {
  const db = await database;
  const [records, addresses, drivers] = await Promise.all([
    db.getAll("records"), db.getAll("addresses"), db.getAll("drivers"),
  ]);
  const byRecord = new Map<string, Address[]>();
  for (const address of addresses.filter((item) => !item.deletedAt)) {
    const list = byRecord.get(address.recordId) || [];
    list.push(address);
    byRecord.set(address.recordId, list);
  }
  return {
    records: records.filter((item) => !item.deletedAt).map((item) => ({
      ...item,
      addresses: (byRecord.get(item.id) || []).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
    })),
    drivers: drivers.filter((item) => !item.deletedAt),
  };
}

export async function putLocalRecord(record: RecordItem): Promise<void> {
  const { addresses, ...core } = record;
  const db = await database;
  await db.put("records", core);
  for (const address of addresses) await db.put("addresses", address);
}

export async function removeLocalRecord(id: string): Promise<void> {
  const db = await database;
  const transaction = db.transaction(["records", "addresses"], "readwrite");
  await transaction.objectStore("records").delete(id);
  const addressKeys = await transaction.objectStore("addresses").index("by-record").getAllKeys(id);
  await Promise.all(addressKeys.map((key) => transaction.objectStore("addresses").delete(key)));
  await transaction.done;
}

export async function putLocalAddress(address: Address): Promise<void> {
  const db = await database;
  if (address.isPrimary) {
    const existing = await db.getAllFromIndex("addresses", "by-record", address.recordId);
    const tx = db.transaction("addresses", "readwrite");
    for (const item of existing) await tx.store.put({ ...item, isPrimary: item.id === address.id });
    await tx.store.put(address);
    await tx.done;
  } else {
    await db.put("addresses", address);
  }
}

export async function removeLocalAddress(id: string): Promise<void> {
  await (await database).delete("addresses", id);
}

export async function putLocalDriver(driver: Driver): Promise<void> {
  await (await database).put("drivers", driver);
}

export async function removeLocalDriver(id: string): Promise<void> {
  await (await database).delete("drivers", id);
}

export async function addPending(mutation: PendingMutation): Promise<void> {
  await (await database).put("pendingMutations", mutation);
}

export async function listPending(): Promise<PendingMutation[]> {
  return (await database).getAllFromIndex("pendingMutations", "by-created");
}

export async function updatePending(mutation: PendingMutation): Promise<void> {
  await (await database).put("pendingMutations", mutation);
}

export async function removePending(id: string): Promise<void> {
  await (await database).delete("pendingMutations", id);
}
