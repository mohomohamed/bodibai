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

export function getGoogleMapsUrl(query: string): string {
  const clean = query.trim();
  const q = clean.toLowerCase().includes("maldives") ? clean : `${clean} Maldives`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function getGoogleMapsDirectionsUrl(query: string): string {
  const clean = query.trim();
  const q = clean.toLowerCase().includes("maldives") ? clean : `${clean} Maldives`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=driving`;
}

export function getGoogleMapsMultiRouteUrl(stops: { address?: string; area?: string; title?: string }[]): string {
  const cleanStops = stops
    .map((s) => {
      const addr = (s.address || "").trim();
      const area = (s.area || "").trim();
      const title = (s.title || "").trim();
      if (addr) return addr.toLowerCase().includes("maldives") ? addr : `${addr}, ${area || "Malé"} Maldives`;
      if (title) return `${title}, ${area || "Malé"} Maldives`;
      return `${area || "Malé"} Maldives`;
    })
    .filter(Boolean);

  if (cleanStops.length === 0) return "https://www.google.com/maps";
  if (cleanStops.length === 1) return getGoogleMapsDirectionsUrl(cleanStops[0]);

  // Google Maps URL scheme supports destination + up to 9 waypoints
  const waypoints = cleanStops.slice(0, -1).slice(0, 9);
  const destination = cleanStops[cleanStops.length - 1];
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoints.join("|"))}&travelmode=driving`;
}

export function getGoogleMapsEmbedUrl(query: string): string {
  const clean = query.trim();
  const q = clean.toLowerCase().includes("maldives") ? clean : `${clean} Maldives`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
}

// Dedicated Admin accounts: "Mohamed" and "Shaufa"
// All other usernames (including "Moho", "Driver 1", "Ali", etc.) are automatically treated as Drivers.
export const ADMIN_USERS = ["mohamed", "shaufa"] as const;

export function isAdminUser(name?: string): boolean {
  if (!name) return false;
  return ADMIN_USERS.includes(name.trim().toLowerCase() as any);
}


export const MALDIVES_PRESETS = [
  { label: "H.", prefix: "H. ", island: "Malé", desc: "Henveiru (Malé)" },
  { label: "M.", prefix: "M. ", island: "Malé", desc: "Machangoalhi (Malé)" },
  { label: "G.", prefix: "G. ", island: "Malé", desc: "Galolhu (Malé)" },
  { label: "Ma.", prefix: "Ma. ", island: "Malé", desc: "Maafannu (Malé)" },
  { label: "Hulhumalé 1", prefix: "Hulhumalé Phase 1, ", island: "Hulhumalé", desc: "Phase 1" },
  { label: "Hulhumalé 2", prefix: "Hulhumalé Phase 2, ", island: "Hulhumalé", desc: "Phase 2" },
  { label: "Hiyaa", prefix: "Hiyaa Flat H", island: "Hulhumalé", desc: "Hiyaa Tower" },
  { label: "Vinares", prefix: "Vinares Flat V", island: "Hulhumalé", desc: "Vinares Tower" },
  { label: "Villimalé", prefix: "Villimalé, ", island: "Villimalé", desc: "Villimalé" },
] as const;

export const DEFAULT_GROUPS = [
  "Shaufa Family",
  "Shaufa Family Friend",
  "Moho Friends",
  "Shaufa Friends",
  "Moho Kaafa Family",
  "Moho Maama Family",
  "Moho Neighbours",
] as const;


