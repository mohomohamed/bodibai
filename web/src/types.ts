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

export type MapProvider = "eatolls" | "google" | "apple" | "waze";

export const MAP_PROVIDERS: Record<MapProvider, {
  id: MapProvider;
  label: string;
  short: string;
  badge: string;
  desc: string;
  getUrl: (q: string) => string;
}> = {
  eatolls: {
    id: "eatolls",
    label: "Eatolls (Maldives Map)",
    short: "Eatolls",
    badge: "Eatolls 🇲🇻",
    desc: "Best for Malé house names & islands",
    getUrl: (q) => `https://eatolls.com/search?q=${encodeURIComponent(q.trim())}`,
  },
  google: {
    id: "google",
    label: "Google Maps",
    short: "Google Maps",
    badge: "Google 📍",
    desc: "Worldwide navigation",
    getUrl: (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${q.trim()} Maldives`)}`,
  },
  apple: {
    id: "apple",
    label: "Apple Maps",
    short: "Apple Maps",
    badge: "Apple 🍏",
    desc: "Native iOS / macOS maps",
    getUrl: (q) => `https://maps.apple.com/?q=${encodeURIComponent(`${q.trim()} Maldives`)}`,
  },
  waze: {
    id: "waze",
    label: "Waze",
    short: "Waze",
    badge: "Waze 🚗",
    desc: "Live traffic & driving directions",
    getUrl: (q) => `https://waze.com/ul?q=${encodeURIComponent(`${q.trim()} Maldives`)}`,
  },
};

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

export const PREFERRED_MAP_KEY = "bondibai-preferred-map";

export function getPreferredMap(): MapProvider {
  if (typeof window === "undefined") return "eatolls";
  const stored = localStorage.getItem(PREFERRED_MAP_KEY) as MapProvider | null;
  return stored && MAP_PROVIDERS[stored] ? stored : "eatolls";
}

export function setPreferredMap(provider: MapProvider): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PREFERRED_MAP_KEY, provider);
  }
}
