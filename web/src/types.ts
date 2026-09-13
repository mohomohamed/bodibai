export interface Address {
  id: string;
  recordId: string;
  label: string;
  addressLine1: string;
  addressLine2: string;
  islandCity: string;
  atollRegion: string;
  country: string;
  notes: string;
  isPrimary: boolean;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
  version: number;
  deletedAt: number | null;
}

export interface RecordItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  category: string;
  groupName: string;
  area: string;
  portions: number;
  deliveryStatus: string;
  driverId: string;
  status: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
  version: number;
  deletedAt: number | null;
  addresses: Address[];
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  area: string;
  notes: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
  version: number;
  deletedAt: number | null;
}

export type EntityType = "record" | "address" | "driver";

export interface PendingMutation {
  id: string;
  type: string;
  method: "POST" | "PUT" | "DELETE";
  path: string;
  payload?: Record<string, unknown>;
  entityType: EntityType;
  entityId: string;
  createdAt: number;
  lastError?: string;
}

export type SyncStatus = "synced" | "syncing" | "offline" | "issue";

export type RecordInput = Pick<RecordItem,
  "id" | "name" | "phone" | "email" | "category" | "groupName" | "area" | "portions" |
  "deliveryStatus" | "driverId" | "status" | "notes"
>;

export type AddressInput = Pick<Address,
  "id" | "recordId" | "label" | "addressLine1" | "addressLine2" | "islandCity" | "atollRegion" |
  "country" | "notes" | "isPrimary"
>;

export type DriverInput = Pick<Driver, "id" | "name" | "phone" | "vehicle" | "area" | "notes" | "active">;
