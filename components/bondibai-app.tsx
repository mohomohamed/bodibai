"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Bike, Car, Check, CheckCheck, ChevronDown, CircleDot, Compass, CookingPot,
  Copy, Download, ExternalLink, Eye, FileUp, Globe, HardDrive, LogOut, MapPin, MessageSquare, Minus, MoreHorizontal, Navigation, PackageCheck, Pencil, Phone, Plus,
  Search, Send, Smartphone, Sparkles, Trash2, Truck, UserCheck, UserPlus, Users, UserX, WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { CsvImportDialog } from "@/components/bondibai/csv-import-dialog";
import { ListPagination } from "@/components/bondibai/list-pagination";
import { MobileDock } from "@/components/bondibai/mobile-dock";
import { MobileFiltersDrawer, type MobileFilterValues } from "@/components/bondibai/mobile-filters-drawer";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  AREAS, AREA_META, DEFAULT_DRIVERS, Driver, DriverVehicle, GROUPS, INITIAL_DRIVERS, INITIAL_RECIPIENTS, Recipient, RecipientArea, RecipientStatus, STATUS_META, getSubZone, mergeDuplicateRecipients, newDriver, newRecipient
} from "@/lib/bondibai-data";

export const MALDIVES_PRESETS = [
  { label: "H.", prefix: "H. ", desc: "Henveiru (Malé)" },
  { label: "M.", prefix: "M. ", desc: "Machangoalhi (Malé)" },
  { label: "G.", prefix: "G. ", desc: "Galolhu (Malé)" },
  { label: "Ma.", prefix: "Ma. ", desc: "Maafannu (Malé)" },
  { label: "Hulhumalé 1", prefix: "Hulhumalé Phase 1, ", desc: "Hulhumalé Phase 1" },
  { label: "Hulhumalé 2", prefix: "Hulhumalé Phase 2, ", desc: "Hulhumalé Phase 2" },
  { label: "Hiyaa", prefix: "Hiyaa Flat H", desc: "Hiyaa Tower (Hulhumalé)" },
  { label: "Vinares", prefix: "Vinares Flat V", desc: "Vinares Tower (Hulhumalé)" },
  { label: "Villimalé", prefix: "Villimalé, ", desc: "Villimalé" },
] as const;

export type MapProvider = "eatolls" | "google" | "apple" | "waze";

export const MAP_PROVIDERS: Record<MapProvider, { id: MapProvider; label: string; short: string; badge: string; desc: string; getUrl: (q: string) => string }> = {
  eatolls: {
    id: "eatolls",
    label: "Eatolls (Maldives Map)",
    short: "Eatolls",
    badge: "Eatolls",
    desc: "Best for Malé house names & islands",
    getUrl: (q) => `https://eatolls.com/search?q=${encodeURIComponent(q.trim())}`,
  },
  google: {
    id: "google",
    label: "Google Maps",
    short: "Google Maps",
    badge: "Google",
    desc: "Worldwide & turn-by-turn navigation",
    getUrl: (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${q.trim()} Maldives`)}`,
  },
  apple: {
    id: "apple",
    label: "Apple Maps",
    short: "Apple Maps",
    badge: "Apple",
    desc: "Native for iPhone, iPad & Mac",
    getUrl: (q) => `https://maps.apple.com/?q=${encodeURIComponent(`${q.trim()} Maldives`)}`,
  },
  waze: {
    id: "waze",
    label: "Waze",
    short: "Waze",
    badge: "Waze",
    desc: "Live traffic & driving directions",
    getUrl: (q) => `https://waze.com/ul?q=${encodeURIComponent(`${q.trim()} Maldives`)}`,
  },
};

export const MAP_STORAGE_KEY = "bondibai-preferred-map";
export const DRIVERS_STORAGE_KEY = "bondibai-drivers-v1";

export function getEatollsUrl(query: string) {
  return MAP_PROVIDERS.eatolls.getUrl(query);
}

export function getMapsUrl(query: string) {
  return MAP_PROVIDERS.google.getUrl(query);
}

const STORAGE_KEY = "bondibai-recipients-v2";
const OLD_STORAGE_KEY = "bondibai-recipients-v1";
const statuses = Object.keys(STATUS_META) as RecipientStatus[];

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalizeStatus(value: string): RecipientStatus {
  const key = value.trim().toLowerCase().replace(/\s+/g, "-");
  if (key === "green" || key === "complete" || key === "done") return "delivered";
  if (key === "red" || key === "hold") return "on-hold";
  if (key === "no-answer" || key === "unreachable" || key === "not-picking-up" || key === "not-answering") return "not-picking-up";
  return statuses.includes(key as RecipientStatus) ? key as RecipientStatus : "planned";
}

function normalizeArea(value: string): RecipientArea {
  const key = value.trim().toLowerCase();
  if (key.includes("villi") || key.includes("viligili")) return "Villimalé";
  if (key.includes("hulhu")) return "Hulhumalé";
  if (key.includes("male") || key.includes("malé")) return "Malé";
  return "Hulhumalé";
}

function importRows(text: string): Recipient[] {
  const rows = parseCsv(text); if (!rows.length) return [];
  const first = rows[0].map(value => value.replace(/^\uFEFF/, "").trim().toLowerCase());
  const known = ["id", "name", "group", "area", "driver", "address", "phone", "portions", "status", "notes", "updated at"];
  const hasHeader = first.some(value => known.includes(value));
  const headers = hasHeader ? first : ["name", "group", "area", "address", "phone", "portions", "status", "notes"];
  return rows.slice(hasHeader ? 1 : 0).filter(row => row.some(Boolean)).map((row, index) => {
    const get = (name: string) => row[headers.indexOf(name)] || "";
    const id = get("id") || crypto.randomUUID();
    return {
      id, name: get("name") || `Imported recipient ${index + 1}`,
      group: get("group") || "Uncategorised",
      area: normalizeArea(get("area")),
      address: get("address"), phone: get("phone"), driver: get("driver") || undefined,
      portions: Math.max(1, Number(get("portions")) || 1), status: normalizeStatus(get("status")),
      notes: get("notes"), updatedAt: get("updated at") || new Date().toISOString(),
    };
  });
}

export function VehicleIcon({ vehicle, className = "size-3" }: { vehicle?: DriverVehicle; className?: string }) {
  switch (vehicle) {
    case "Motorcycle":
      return <Bike className={className} />;
    case "Car":
      return <Car className={className} />;
    case "Van":
    case "Pickup":
      return <Truck className={className} />;
    case "Bicycle":
      return <Bike className={className} />;
    default:
      return <Car className={className} />;
  }
}

export function DriverBadge({ driver, vehicle }: { driver?: string; vehicle?: DriverVehicle }) {
  if (!driver || driver === "Unassigned") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
        <UserX className="size-3" />
        Unassigned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
      <VehicleIcon vehicle={vehicle} className="size-3 text-purple-600" />
      {driver}
    </span>
  );
}

export function AreaBadge({ area }: { area: RecipientArea }) {
  const meta = AREA_META[area] || AREA_META["Hulhumalé"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.tone}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: RecipientStatus }) {
  const meta = STATUS_META[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.tone}`}><span className="size-1.5 rounded-full bg-current opacity-70" />{meta.label}</span>;
}

const subscribeToHydration = () => () => undefined;

export function BondibaiApp() {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  if (!hydrated) return <main className="grid min-h-screen place-items-center text-slate-500">Loading your list…</main>;
  return <BondibaiDashboard />;
}

function readStoredRows() {
  try {
    const savedV2 = localStorage.getItem(STORAGE_KEY);
    if (savedV2) return JSON.parse(savedV2) as Recipient[];
    const savedV1 = localStorage.getItem(OLD_STORAGE_KEY);
    if (!savedV1) return INITIAL_RECIPIENTS;

    const parsedV1 = JSON.parse(savedV1) as Recipient[];
    const initialMap = new Map(INITIAL_RECIPIENTS.map(row => [`${row.group}:::${row.name}`, row.area]));
    return mergeDuplicateRecipients(parsedV1.map(row => ({
      ...row,
      area: row.area || initialMap.get(`${row.group}:::${row.name}`) || "Hulhumalé",
    }))).merged;
  } catch {
    return INITIAL_RECIPIENTS;
  }
}

function readStoredDrivers() {
  try {
    const saved = localStorage.getItem(DRIVERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) as Driver[] : INITIAL_DRIVERS;
  } catch {
    return INITIAL_DRIVERS;
  }
}

function BondibaiDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<Recipient[]>(readStoredRows);
  const [drivers, setDrivers] = useState<Driver[]>(readStoredDrivers);
  const [isDriverPanelOpen, setIsDriverPanelOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteDriverTarget, setDeleteDriverTarget] = useState<Driver | null>(null);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("All groups");
  const [areaFilter, setAreaFilter] = useState<string>("All areas");
  const [zoneFilter, setZoneFilter] = useState<string>("All zones");
  const [driverFilter, setDriverFilter] = useState<string>("All drivers");
  const [addressFilter, setAddressFilter] = useState<"all" | "has-address" | "missing-address">("all");
  const [status, setStatus] = useState("All statuses");
  const [missingAddress, setMissingAddress] = useState(false);
  const [editing, setEditing] = useState<Recipient | null>(null);
  const [quickAddressTarget, setQuickAddressTarget] = useState<Recipient | null>(null);
  const [mapModalTarget, setMapModalTarget] = useState<Recipient | null>(null);
  const [preferredMap, setPreferredMap] = useState<MapProvider>(() => {
    const saved = localStorage.getItem(MAP_STORAGE_KEY) as MapProvider | null;
    return saved && MAP_PROVIDERS[saved] ? saved : "eatolls";
  });
  const [deleteTarget, setDeleteTarget] = useState<Recipient | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt?: () => Promise<void> } | null>(null);
  const [pendingImport, setPendingImport] = useState<Recipient[] | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLElement>(null);

  const activeMapTarget = useMemo(() => {
    if (!mapModalTarget) return null;
    return rows.find(r => r.id === mapModalTarget.id) || mapModalTarget;
  }, [rows, mapModalTarget]);

  useEffect(() => {
    const onOnline = () => setOnline(true); const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as Event & { prompt: () => Promise<void> }); };
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline); window.addEventListener("beforeinstallprompt", onInstall);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); window.removeEventListener("beforeinstallprompt", onInstall); };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches("input, textarea, select, [contenteditable='true']");
      if (event.key === "/" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        filtersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        searchRef.current?.focus({ preventScroll: true });
      }
      if (event.key.toLowerCase() === "n" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setEditing(newRecipient(GROUPS[0]));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSelectPreferredMap(map: MapProvider) {
    setPreferredMap(map);
    localStorage.setItem(MAP_STORAGE_KEY, map);
    toast.success(`Default map set to ${MAP_PROVIDERS[map].label}`);
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    const model = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void } }).modelContext;
    if (!model?.registerTool) return;
    const lifecycle = new AbortController();
    model.registerTool({
      name: "add_bondibai_recipient", title: "Add Bondibai recipient", description: "Add one recipient or household to the Bondibai list stored on this device.",
      inputSchema: { type: "object", properties: { name: { type: "string" }, group: { type: "string" }, address: { type: "string" }, portions: { type: "number" } }, required: ["name"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input: unknown) => {
        const data = input as { name?: string; group?: string; address?: string; portions?: number };
        if (!data.name?.trim()) throw new Error("Name is required.");
        const item = { ...newRecipient(data.group || GROUPS[0]), name: data.name.trim(), address: data.address || "", portions: Math.max(1, data.portions || 1) };
        setRows(current => [...current, item]); return { id: item.id, status: item.status };
      },
    }, { signal: lifecycle.signal });
    return () => lifecycle.abort();
  }, []);

  const allDriverNames = useMemo(() => {
    const driverNamesFromState = drivers.map(d => d.name.trim()).filter(Boolean);
    const fromRows = rows.map(r => (r.driver || "").trim()).filter(Boolean);
    return Array.from(new Set<string>([...driverNamesFromState, ...fromRows]));
  }, [drivers, rows]);

  const driverMap = useMemo(() => {
    const map = new Map<string, Driver>();
    drivers.forEach(d => map.set(d.name.toLowerCase(), d));
    return map;
  }, [drivers]);

  const allDrivers = allDriverNames;

  const availableZones = useMemo(() => {
    const currentAreaRows = areaFilter === "All areas" ? rows : rows.filter(r => (r.area || "Hulhumalé") === areaFilter);
    const detected = new Set<string>();
    currentAreaRows.forEach(r => {
      if (r.address.trim()) {
        detected.add(getSubZone(r.address, r.area || "Hulhumalé"));
      }
    });
    return Array.from(detected).sort();
  }, [rows, areaFilter]);

  const visible = useMemo(() => rows.filter(row => {
    const haystack = `${row.name} ${row.address} ${row.phone} ${row.notes} ${row.area || ""} ${row.driver || ""}`.toLowerCase();
    const subZone = getSubZone(row.address, row.area || "Hulhumalé");
    const hasAddr = Boolean(row.address.trim());

    return (
      (!search || haystack.includes(search.toLowerCase())) &&
      (group === "All groups" || row.group === group) &&
      (areaFilter === "All areas" || (row.area || "Hulhumalé") === areaFilter) &&
      (status === "All statuses" || row.status === status) &&
      (driverFilter === "All drivers" || (driverFilter === "Unassigned" ? !row.driver : row.driver === driverFilter)) &&
      (zoneFilter === "All zones" || subZone === zoneFilter) &&
      (addressFilter === "all" || (addressFilter === "has-address" ? hasAddr : !hasAddr)) &&
      (!missingAddress || !hasAddr)
    );
  }), [rows, search, group, areaFilter, status, driverFilter, zoneFilter, addressFilter, missingAddress]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedVisible = useMemo(
    () => visible.slice((safePage - 1) * pageSize, safePage * pageSize),
    [visible, safePage, pageSize],
  );

  const summary = useMemo(() => ({
    households: rows.length,
    portions: rows.reduce((sum, row) => sum + row.portions, 0),
    delivered: rows.filter(row => row.status === "delivered").length,
    missing: rows.filter(row => !row.address.trim()).length,
    male: rows.filter(row => row.area === "Malé").length,
    malePortions: rows.filter(row => row.area === "Malé").reduce((sum, row) => sum + row.portions, 0),
    hulhumale: rows.filter(row => (row.area || "Hulhumalé") === "Hulhumalé").length,
    hulhumalePortions: rows.filter(row => (row.area || "Hulhumalé") === "Hulhumalé").reduce((sum, row) => sum + row.portions, 0),
    villimale: rows.filter(row => row.area === "Villimalé").length,
    villimalePortions: rows.filter(row => row.area === "Villimalé").reduce((sum, row) => sum + row.portions, 0),
  }), [rows]);
  const progress = summary.households ? Math.round(summary.delivered / summary.households * 100) : 0;
  const visibleSummary = useMemo(() => ({
    portions: visible.reduce((sum, row) => sum + row.portions, 0),
    delivered: visible.filter(row => row.status === "delivered").length,
    missing: visible.filter(row => !row.address.trim()).length,
  }), [visible]);
  const groups = useMemo<string[]>(() => Array.from(new Set<string>([...GROUPS, ...rows.map(row => row.group)])), [rows]);
  const activeFilterCount = [
    group !== "All groups",
    areaFilter !== "All areas",
    zoneFilter !== "All zones",
    driverFilter !== "All drivers",
    status !== "All statuses",
    addressFilter !== "all",
  ].filter(Boolean).length;

  function resetFilters() {
    setSearch("");
    setGroup("All groups");
    setAreaFilter("All areas");
    setZoneFilter("All zones");
    setDriverFilter("All drivers");
    setStatus("All statuses");
    setAddressFilter("all");
    setMissingAddress(false);
    setPage(1);
  }

  function updateMobileFilter(field: keyof MobileFilterValues, value: string) {
    if (field === "area") { setAreaFilter(value); setZoneFilter("All zones"); }
    if (field === "zone") setZoneFilter(value);
    if (field === "group") setGroup(value);
    if (field === "driver") setDriverFilter(value);
    if (field === "status") setStatus(value);
    if (field === "address") {
      const addressValue = value as "all" | "has-address" | "missing-address";
      setAddressFilter(addressValue);
      setMissingAddress(addressValue === "missing-address");
    }
    setPage(1);
  }

  const driverStats = useMemo(() => {
    const unassigned = rows.filter(r => !r.driver);
    const map: Record<string, { count: number; portions: number; delivered: number; pending: number }> = {};
    allDriverNames.forEach(d => {
      const list = rows.filter(r => r.driver === d);
      map[d] = {
        count: list.length,
        portions: list.reduce((sum, r) => sum + r.portions, 0),
        delivered: list.filter(r => r.status === "delivered").length,
        pending: list.filter(r => r.status !== "delivered").length,
      };
    });
    return {
      unassignedCount: unassigned.length,
      unassignedPortions: unassigned.reduce((sum, r) => sum + r.portions, 0),
      drivers: map,
    };
  }, [rows, allDriverNames]);

  const duplicateInfo = useMemo(() => {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const r of rows) {
      const key = `${r.group.toLowerCase()}:::${r.name.toLowerCase()}`;
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    }
    return duplicates;
  }, [rows]);

  function handleMergeDuplicates() {
    const { merged, duplicateCount } = mergeDuplicateRecipients(rows);
    if (duplicateCount > 0) {
      setRows(merged);
      toast.success(`Merged ${duplicateCount} duplicate household${duplicateCount > 1 ? "s" : ""} into combined Bondibai portions!`);
    } else {
      toast.info("No duplicates found to merge.");
    }
  }

  function updatePortions(id: string, delta: number) {
    setRows(current =>
      current.map(row => {
        if (row.id === id) {
          const nextPortions = Math.max(1, (row.portions || 1) + delta);
          return { ...row, portions: nextPortions, updatedAt: new Date().toISOString() };
        }
        return row;
      })
    );
  }

  function updateArea(id: string, area: RecipientArea) {
    setRows(current =>
      current.map(row => (row.id === id ? { ...row, area, updatedAt: new Date().toISOString() } : row))
    );
    toast.success(`Area updated to ${area}`);
  }

  function updateDriver(id: string, driver: string) {
    setRows(current =>
      current.map(row => (row.id === id ? { ...row, driver, updatedAt: new Date().toISOString() } : row))
    );
    toast.success(driver ? `Assigned to ${driver}` : "Marked unassigned");
  }

  function batchAssignDriver(driverName: string) {
    const visibleIds = new Set(visible.map(r => r.id));
    const targetDriver = driverName === "Unassigned" ? "" : driverName;
    const previousAssignments = new Map(visible.map(row => [row.id, row.driver || ""]));
    setRows(current =>
      current.map(row => (visibleIds.has(row.id) ? { ...row, driver: targetDriver, updatedAt: new Date().toISOString() } : row))
    );
    toast.success(`Assigned ${visible.length} households to ${driverName}.`, {
      action: {
        label: "Undo",
        onClick: () => setRows(current => current.map(row => previousAssignments.has(row.id)
          ? { ...row, driver: previousAssignments.get(row.id), updatedAt: new Date().toISOString() }
          : row)),
      },
    });
  }

  function handleSaveDriver(driverData: Driver) {
    const cleanName = driverData.name.trim();
    if (!cleanName) {
      toast.error("Driver name cannot be empty.");
      return;
    }

    const existingIndex = drivers.findIndex(d => d.id === driverData.id);
    if (existingIndex === -1) {
      // New Driver: Check duplicate name
      if (drivers.some(d => d.name.toLowerCase() === cleanName.toLowerCase())) {
        toast.error(`A driver named "${cleanName}" already exists.`);
        return;
      }
      const created: Driver = {
        ...driverData,
        name: cleanName,
        createdAt: new Date().toISOString(),
      };
      setDrivers(curr => [...curr, created]);
      toast.success(`Driver "${cleanName}" added successfully!`);
    } else {
      // Update Driver
      const oldDriver = drivers[existingIndex];
      const oldName = oldDriver.name;

      // If name changed, check collision
      if (
        oldName.toLowerCase() !== cleanName.toLowerCase() &&
        drivers.some(d => d.id !== driverData.id && d.name.toLowerCase() === cleanName.toLowerCase())
      ) {
        toast.error(`A driver named "${cleanName}" already exists.`);
        return;
      }

      // If name changed, rename in assigned recipients!
      if (oldName !== cleanName) {
        setRows(curr =>
          curr.map(r => (r.driver === oldName ? { ...r, driver: cleanName, updatedAt: new Date().toISOString() } : r))
        );
        if (driverFilter === oldName) setDriverFilter(cleanName);
      }

      setDrivers(curr =>
        curr.map(d => (d.id === driverData.id ? { ...driverData, name: cleanName } : d))
      );
      toast.success(`Driver "${cleanName}" updated!`);
    }
    setEditingDriver(null);
  }

  function handleDeleteDriver(driver: Driver) {
    setRows(curr =>
      curr.map(r => (r.driver === driver.name ? { ...r, driver: "", updatedAt: new Date().toISOString() } : r))
    );
    setDrivers(curr => curr.filter(d => d.id !== driver.id));
    if (driverFilter === driver.name) setDriverFilter("All drivers");
    setDeleteDriverTarget(null);
    toast.success(`Driver "${driver.name}" deleted and assigned households unassigned.`);
  }

  function copyDriverRoute(targetDriver?: string) {
    const targetRows = targetDriver && targetDriver !== "All drivers"
      ? rows.filter(r => (targetDriver === "Unassigned" ? !r.driver : r.driver === targetDriver))
      : visible;

    if (!targetRows.length) {
      toast.info("No recipients in this route.");
      return;
    }

    const totalPortions = targetRows.reduce((sum, r) => sum + r.portions, 0);
    const title = targetDriver && targetDriver !== "All drivers" ? `Driver: ${targetDriver}` : `Route: ${areaFilter}`;
    
    const header = `🛵 *BONDIBAI DELIVERY ROUTE*\n` +
      `📌 *${title}*\n` +
      `📦 Total: ${targetRows.length} households • ${totalPortions} Bondibai Portions\n` +
      `----------------------------------------\n\n`;

    const body = targetRows.map((r, i) => {
      const addr = r.address ? `📍 ${r.address} (${r.area || "Maldives"})` : `⚠️ Address needed (${r.area || "Maldives"})`;
      const phone = r.phone ? `📞 ${r.phone}` : ``;
      const map = r.address ? `🗺️ ${MAP_PROVIDERS[preferredMap].getUrl(`${r.address}, ${r.area || "Maldives"}`)}` : ``;
      const portions = r.portions > 1 ? `🍲 *${r.portions} Bondibai*` : `🍲 1 portion`;
      const status = r.status === "delivered" ? `✅ Delivered` : `⏳ Pending`;
      return `${i + 1}. *${r.name}* [${portions}] - ${status}\n   ${addr}\n   ${phone ? `${phone}\n   ` : ""}${map ? `${map}\n` : ""}`;
    }).join("\n");

    const fullText = `${header}${body}`;
    navigator.clipboard.writeText(fullText);
    toast.success("Driver delivery route copied to clipboard!");
  }

  function shareDriverRouteWhatsapp(targetDriver?: string, driverPhone?: string) {
    const targetRows = targetDriver && targetDriver !== "All drivers"
      ? rows.filter(r => (targetDriver === "Unassigned" ? !r.driver : r.driver === targetDriver))
      : visible;

    if (!targetRows.length) {
      toast.info("No recipients in this route.");
      return;
    }

    const totalPortions = targetRows.reduce((sum, r) => sum + r.portions, 0);
    const title = targetDriver && targetDriver !== "All drivers" ? `Driver: ${targetDriver}` : `Route: ${areaFilter}`;
    
    const header = `🛵 *BONDIBAI DELIVERY ROUTE*\n` +
      `📌 *${title}*\n` +
      `📦 Total: ${targetRows.length} households • ${totalPortions} Bondibai Portions\n` +
      `----------------------------------------\n\n`;

    const body = targetRows.map((r, i) => {
      const addr = r.address ? `📍 ${r.address} (${r.area || "Maldives"})` : `⚠️ Address needed (${r.area || "Maldives"})`;
      const phone = r.phone ? `📞 ${r.phone}` : ``;
      const map = r.address ? `🗺️ ${MAP_PROVIDERS[preferredMap].getUrl(`${r.address}, ${r.area || "Maldives"}`)}` : ``;
      const portions = r.portions > 1 ? `🍲 *${r.portions} Bondibai*` : `🍲 1 portion`;
      const status = r.status === "delivered" ? `✅ Delivered` : `⏳ Pending`;
      return `${i + 1}. *${r.name}* [${portions}] - ${status}\n   ${addr}\n   ${phone ? `${phone}\n   ` : ""}${map ? `${map}\n` : ""}`;
    }).join("\n");

    const cleanPhone = (driverPhone || "").replace(/\D/g, "");
    const phoneParam = cleanPhone ? (cleanPhone.startsWith("960") ? cleanPhone : `960${cleanPhone}`) : "";
    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(`${header}${body}`)}`
      : `https://wa.me/?text=${encodeURIComponent(`${header}${body}`)}`;

    window.open(waUrl, "_blank");
  }

  function saveRecipient(event: FormEvent) {
    event.preventDefault(); if (!editing?.name.trim()) return;
    const item = { ...editing, portions: Math.max(1, Number(editing.portions) || 1), updatedAt: new Date().toISOString() };
    setRows(current => current.some(row => row.id === item.id) ? current.map(row => row.id === item.id ? item : row) : [...current, item]);
    setEditing(null); toast.success("Recipient saved on this device.");
  }

  function updateAddress(id: string, address: string) {
    setRows(current => current.map(row => row.id === id ? { ...row, address: address.trim(), updatedAt: new Date().toISOString() } : row));
    toast.success("Address updated.");
  }

  function updateStatus(id: string, value: RecipientStatus) {
    setRows(current => current.map(row => row.id === id ? { ...row, status: value, updatedAt: new Date().toISOString() } : row));
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const imported = importRows(await file.text());
      if (!imported.length) throw new Error("No usable rows were found.");
      setPendingImport(imported);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Import failed."); }
    event.target.value = "";
  }

  function applyImport(mode: "append" | "replace") {
    if (!pendingImport) return;
    const importedCount = pendingImport.length;
    setRows(current => mode === "replace" ? pendingImport : [...current, ...pendingImport]);
    setPendingImport(null);
    toast.success(mode === "replace" ? `List replaced with ${importedCount} households.` : `${importedCount} households added.`);
  }

  function exportCsv() {
    const header = ["ID","Name","Group","Area","Driver","Address","Phone","Portions","Status","Notes","Updated At"];
    const data = rows.map(row => [row.id,row.name,row.group,row.area || "Hulhumalé",row.driver || "",row.address,row.phone,row.portions,row.status,row.notes,row.updatedAt]);
    const csv = `\uFEFF${[header, ...data].map(line => line.map(escapeCsv).join(",")).join("\n")}`;
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "bondibai-list.csv"; link.click(); URL.revokeObjectURL(link.href);
    toast.success("CSV exported successfully.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  async function installApp() {
    await installPrompt?.prompt?.();
    setInstallPrompt(null);
  }

  return (
    <main className="min-h-screen pb-28 pt-3 text-slate-900 md:pb-16 md:pt-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Header */}
        <header className="glass sticky top-2 z-30 -mx-1 flex flex-col gap-3 rounded-2xl border border-white/90 p-3 shadow-[0_12px_36px_rgba(8,47,73,.10)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#087e8b] to-[#0b3b52] text-white shadow-md">
                <CookingPot className="size-5" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#082f49]">Bondibai List</h1>
                <p className="text-xs sm:text-sm text-slate-500">Fast island delivery routing & portion tracking</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!online && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                <WifiOff className="size-3.5" /> Offline Mode
              </span>
            )}
            {installPrompt && (
              <Button
                variant="outline"
                size="sm"
                onClick={installApp}
                className="h-9 gap-1.5 rounded-xl border-slate-200"
              >
                <Smartphone className="size-4 text-[#087e8b]" /> Install App
              </Button>
            )}
            <input ref={fileRef} type="file" accept=".csv" onChange={importFile} className="hidden" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              className="hidden h-9 gap-1.5 rounded-xl border-slate-200 sm:inline-flex"
              title="Import CSV"
            >
              <FileUp className="size-4" /> Import CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              className="hidden h-9 gap-1.5 rounded-xl border-slate-200 sm:inline-flex"
              title="Export CSV"
            >
              <Download className="size-4" /> Export CSV
            </Button>
            {duplicateInfo > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMergeDuplicates}
                className="h-9 gap-1.5 rounded-xl border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                title="Merge duplicate entries into combined Bondibai portions"
              >
                <Sparkles className="size-4 text-amber-600" /> Merge {duplicateInfo} Dupes
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setEditing(newRecipient(GROUPS[0]))}
              className="hidden h-9 gap-1.5 rounded-xl bg-[#087e8b] text-white shadow-sm hover:bg-[#076c77] md:inline-flex"
            >
              <Plus className="size-4" /> Add Household
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="h-9 gap-1 text-slate-500 hover:text-rose-700"
              title="Logout"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <aside className="flex items-start gap-3 rounded-2xl border border-cyan-200/80 bg-cyan-50/70 px-4 py-3 text-sm text-[#075866]">
          <HardDrive className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Saved automatically on this device</p>
            <p className="mt-0.5 text-xs leading-5 text-[#075866]/80">Export a CSV before switching browsers or clearing website data.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={exportCsv} className="hidden shrink-0 border-cyan-300 bg-white/80 sm:inline-flex">
            <Download className="size-3.5" /> Back up now
          </Button>
        </aside>

        {/* Summary Stats Cards */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <SummaryCard
            icon={<Users className="size-5" />}
            label="Total Households"
            value={summary.households}
            hint="Unique family recipient entries"
          />
          <SummaryCard
            icon={<CookingPot className="size-5" />}
            label="Bondibai Portions"
            value={summary.portions}
            hint={`Malé: ${summary.malePortions} • Hulhumalé: ${summary.hulhumalePortions} • Villi: ${summary.villimalePortions}`}
          />
          <SummaryCard
            icon={<PackageCheck className="size-5" />}
            label="Delivered"
            value={summary.delivered}
            hint={`${progress}% progress completed`}
          />
          <SummaryCard
            icon={<AlertTriangle className="size-5 text-amber-600" />}
            label="Address Needed"
            value={summary.missing}
            hint="Click to filter missing addresses"
            alert={summary.missing > 0}
            onClick={() => {
              setMissingAddress(prev => !prev);
              setAddressFilter(prev => prev === "missing-address" ? "all" : "missing-address");
            }}
          />
        </section>

        {/* Island Location Quick Filters & Sub-Zones */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="size-4 text-[#087e8b]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Select Location / Island</span>
            </div>
            <span className="text-xs text-slate-400">Filter by island & neighborhood for driver dispatch</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={areaFilter === "All areas"}
              onClick={() => { setAreaFilter("All areas"); setZoneFilter("All zones"); }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                areaFilter === "All areas"
                  ? "bg-[#082f49] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>All Locations</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${areaFilter === "All areas" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>
                {summary.households}
              </span>
            </button>

            {AREAS.map(area => {
              const meta = AREA_META[area];
              const count = area === "Malé" ? summary.male : area === "Villimalé" ? summary.villimale : summary.hulhumale;
              const portions = area === "Malé" ? summary.malePortions : area === "Villimalé" ? summary.villimalePortions : summary.hulhumalePortions;
              const isSelected = areaFilter === area;

              return (
                <button
                  type="button"
                  key={area}
                  aria-pressed={isSelected}
                  onClick={() => { setAreaFilter(area); setZoneFilter("All zones"); }}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all border ${
                    isSelected
                      ? `${meta.tone} ring-2 ring-[#087e8b] font-bold shadow-xs`
                      : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  <span className={`size-2 rounded-full ${meta.dot}`} />
                  <span>{meta.label}</span>
                  <span className="rounded-full bg-black/5 px-1.5 py-0.2 text-[10px] text-slate-600 font-medium">
                    {count} ({portions} 🍲)
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sub-Zones Quick Filter (Wards / Towers / Phases) */}
          {availableZones.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Sub-Zones:</span>
              <button
                type="button"
                onClick={() => setZoneFilter("All zones")}
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-all ${
                  zoneFilter === "All zones"
                    ? "bg-[#087e8b] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Sub-Zones
              </button>
              {availableZones.map(zone => {
                const isSelected = zoneFilter === zone;
                const zoneCount = (areaFilter === "All areas" ? rows : rows.filter(r => (r.area || "Hulhumalé") === areaFilter))
                  .filter(r => getSubZone(r.address, r.area || "Hulhumalé") === zone).length;
                return (
                  <button
                    type="button"
                    key={zone}
                    onClick={() => setZoneFilter(zone)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all border ${
                      isSelected
                        ? "bg-cyan-100 border-cyan-300 text-[#082f49] font-bold shadow-2xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <span>{zone}</span>
                    <span className="ml-1 text-[10px] opacity-75">({zoneCount})</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Driver Assignment & Route Dispatch Toolbar */}
        <section className="rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-50/50 via-white to-indigo-50/40 p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2">
              <Car className="size-4 text-purple-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900">2. Driver Assignment & Route Dispatch</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsDriverPanelOpen(true)}
                className="h-8 gap-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-xs"
              >
                <Users className="size-3.5" />
                <span>Manage Drivers ({drivers.length})</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingDriver(newDriver())}
                className="h-8 gap-1.5 rounded-lg border-purple-300 bg-white text-purple-800 hover:bg-purple-50 text-xs font-semibold"
              >
                <UserPlus className="size-3.5 text-purple-600" />
                <span className="hidden sm:inline">Add Driver</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg border-purple-300 bg-white text-purple-800 hover:bg-purple-50 text-xs font-semibold">
                    <UserCheck className="size-3.5 text-purple-600" />
                    <span>Assign visible ({visible.length}) to...</span>
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Batch Assign to Driver</p>
                  {allDrivers.map(d => {
                    const dObj = driverMap.get(d.toLowerCase());
                    return (
                      <DropdownMenuItem key={d} onClick={() => batchAssignDriver(d)} className="text-xs flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <VehicleIcon vehicle={dObj?.vehicle} className="size-3.5 text-purple-600" />
                          <span>{d}</span>
                        </div>
                        {dObj?.area && dObj.area !== "All Areas" && (
                          <span className="text-[10px] text-slate-400">{dObj.area}</span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => batchAssignDriver("Unassigned")} className="text-xs text-rose-700">
                    <UserX className="size-3.5 mr-1.5 text-rose-500" />
                    <span>Mark all Unassigned</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                variant="outline"
                onClick={() => copyDriverRoute(driverFilter)}
                className="h-8 gap-1.5 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs"
                title="Copy delivery route text with addresses and map links"
              >
                <Copy className="size-3.5" />
                <span className="hidden sm:inline">Copy Route</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  const currentDriverObj = driverMap.get(driverFilter.toLowerCase());
                  shareDriverRouteWhatsapp(driverFilter, currentDriverObj?.phone);
                }}
                className="h-8 gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-xs"
                title="Send route directly to Driver on WhatsApp"
              >
                <Send className="size-3.5" />
                <span>WhatsApp Route</span>
              </Button>
            </div>
          </div>

          {/* Driver Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDriverFilter("All drivers")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                driverFilter === "All drivers"
                  ? "bg-purple-900 text-white shadow-2xs"
                  : "bg-white border border-purple-200 text-purple-800 hover:bg-purple-50"
              }`}
            >
              All Drivers
            </button>

            <button
              type="button"
              onClick={() => setDriverFilter("Unassigned")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border ${
                driverFilter === "Unassigned"
                  ? "bg-amber-600 text-white border-amber-600 shadow-2xs font-bold"
                  : "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
              }`}
            >
              <span>⚠️ Unassigned</span>
              <span className="ml-1 rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">
                {driverStats.unassignedCount} ({driverStats.unassignedPortions} 🍲)
              </span>
            </button>

            {allDrivers.map(d => {
              const stat = driverStats.drivers[d] || { count: 0, portions: 0, delivered: 0, pending: 0 };
              const isSelected = driverFilter === d;
              const dObj = driverMap.get(d.toLowerCase());
              const isComplete = stat.count > 0 && stat.delivered === stat.count;

              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDriverFilter(d)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border ${
                    isSelected
                      ? "bg-purple-700 text-white border-purple-700 shadow-2xs font-bold"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-900"
                  }`}
                >
                  <VehicleIcon vehicle={dObj?.vehicle} className={`size-3 ${isSelected ? "text-purple-200" : "text-purple-600"}`} />
                  <span>{d}</span>
                  {dObj?.area && dObj.area !== "All Areas" && (
                    <span className={`text-[10px] px-1 rounded ${isSelected ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700"}`}>
                      {dObj.area}
                    </span>
                  )}
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : isComplete
                      ? "bg-emerald-100 text-emerald-800 font-bold"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {isComplete ? `✓ ${stat.count}` : `${stat.count} (${stat.portions} 🍲)`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Search & Secondary Filter Bar */}
        <section ref={filtersRef} className="scroll-mt-24 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search recipient, house, street, phone, driver..."
              className="h-10 pl-9 rounded-xl bg-slate-50/50 border-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger className="h-10 w-[140px] rounded-xl border-slate-200">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All groups">All Groups</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 w-[140px] rounded-xl border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All statuses">All Statuses</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={addressFilter} onValueChange={(val: "all" | "has-address" | "missing-address") => {
              setAddressFilter(val);
              setMissingAddress(val === "missing-address");
            }}>
              <SelectTrigger className="h-10 w-[150px] rounded-xl border-slate-200">
                <SelectValue placeholder="Address filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Addresses</SelectItem>
                <SelectItem value="has-address">📍 Has Address</SelectItem>
                <SelectItem value="missing-address">⚠️ Address Needed</SelectItem>
              </SelectContent>
            </Select>

            {(search || group !== "All groups" || areaFilter !== "All areas" || zoneFilter !== "All zones" || driverFilter !== "All drivers" || status !== "All statuses" || addressFilter !== "all" || missingAddress) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-10 text-xs text-rose-600 hover:bg-rose-50"
              >
                Reset filters
              </Button>
            )}
          </div>
        </section>

        {/* Recipients Table & Mobile Cards */}
        <section aria-label="Delivery list results" className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-[#082f49]">Delivery list</h2>
              <p className="text-xs text-slate-500" aria-live="polite">
                {visible.length === rows.length ? `${rows.length} households` : `${visible.length} of ${rows.length} households`} · {visibleSummary.portions} portions
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">{visibleSummary.delivered} delivered</span>
              {visibleSummary.missing > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-900">{visibleSummary.missing} need addresses</span>}
            </div>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Recipient / household</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Island / Area</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3 text-center">Portions (Bondibai)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="w-14 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pagedVisible.map(row => (
                  <tr key={row.id} className="border-t bg-white/75 hover:bg-cyan-50/35 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      {row.phone && <p className="mt-1 text-xs text-slate-500">{row.phone}</p>}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{row.group}</td>
                    <td className="px-4 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="cursor-pointer hover:opacity-80 transition-opacity" title="Click to change Island / Area">
                            <AreaBadge area={row.area || "Hulhumalé"} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Change Island</p>
                          {AREAS.map(a => (
                            <DropdownMenuItem key={a} onClick={() => updateArea(row.id, a)} className="flex items-center justify-between">
                              <AreaBadge area={a} />
                              {row.area === a && <Check className="size-3.5 text-[#087e8b]" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="max-w-[280px] px-4 py-4">
                      {row.address ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setMapModalTarget(row)}
                            className="text-left font-medium text-slate-700 hover:text-[#087e8b] hover:underline truncate"
                            title="Click to view location and map modal"
                          >
                            {row.address}
                          </button>
                          <MapMenu
                            query={`${row.address}, ${row.area || "Maldives"}`}
                            preferredMap={preferredMap}
                            onSelectPreferred={handleSelectPreferredMap}
                            onOpenModal={() => setMapModalTarget(row)}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setQuickAddressTarget(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-all shadow-xs"
                          title="Click to add address and lookup map"
                        >
                          <MapPin className="size-3 text-amber-600" />
                          <span>Address needed</span>
                          <span className="rounded bg-amber-200/80 px-1 py-0.5 text-[10px] font-bold text-amber-900">{MAP_PROVIDERS[preferredMap].badge}</span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="cursor-pointer hover:opacity-80 transition-opacity" title="Assign driver">
                            <DriverBadge driver={row.driver} vehicle={driverMap.get((row.driver || "").toLowerCase())?.vehicle} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Assign Driver</p>
                          {allDrivers.map(d => {
                            const dObj = driverMap.get(d.toLowerCase());
                            return (
                              <DropdownMenuItem key={d} onClick={() => updateDriver(row.id, d)} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <VehicleIcon vehicle={dObj?.vehicle} className="size-3 text-purple-600" />
                                  <span>{d}</span>
                                </div>
                                {row.driver === d && <Check className="size-3.5 text-purple-600" />}
                              </DropdownMenuItem>
                            );
                          })}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => updateDriver(row.id, "")} className="text-xs text-rose-700">
                            <span>Unassigned</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 justify-center">
                        <button
                          type="button"
                          onClick={() => updatePortions(row.id, -1)}
                          disabled={row.portions <= 1}
                          className="grid size-6 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs"
                          title="Decrease portions"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span
                          className={`min-w-8 px-2 py-0.5 rounded-md text-xs font-bold text-center transition-all ${
                            row.portions > 1
                              ? "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold shadow-2xs"
                              : "bg-slate-100 text-slate-700"
                          }`}
                          title={`${row.portions} Bondibai portion${row.portions > 1 ? "s" : ""}`}
                        >
                          {row.portions > 1 ? `🍲 ${row.portions}` : row.portions}
                        </span>
                        <button
                          type="button"
                          onClick={() => updatePortions(row.id, 1)}
                          className="grid size-6 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-colors shadow-2xs"
                          title="Increase portions (+1 Bondibai)"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Select value={row.status} onValueChange={value => updateStatus(row.id, value as RecipientStatus)}>
                        <SelectTrigger className="h-9 w-[132px] border-0 bg-transparent p-0 shadow-none">
                          <SelectValue><StatusBadge status={row.status} /></SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(item => (
                            <SelectItem key={item} value={item}>{STATUS_META[item].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-4">
                      <RowMenu edit={() => setEditing({ ...row })} remove={() => setDeleteTarget(row)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y md:hidden">
            {pagedVisible.map(row => (
              <article key={row.id} className="bg-white/75 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <AreaBadge area={row.area || "Hulhumalé"} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{row.group}</p>
                  </div>
                  <RowMenu edit={() => setEditing({ ...row })} remove={() => setDeleteTarget(row)} />
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto] gap-3 items-center">
                  {row.address ? (
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <button
                        onClick={() => setMapModalTarget(row)}
                        className="flex items-center gap-1.5 text-left text-sm font-medium text-slate-700 hover:text-[#087e8b] truncate"
                        title="Tap to view location and navigation"
                      >
                        <MapPin className="size-4 shrink-0 text-[#087e8b]" />
                        <span className="truncate">{row.address}</span>
                      </button>
                      <MapMenu
                        query={`${row.address}, ${row.area || "Maldives"}`}
                        preferredMap={preferredMap}
                        onSelectPreferred={handleSelectPreferredMap}
                        onOpenModal={() => setMapModalTarget(row)}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setQuickAddressTarget(row)}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 w-fit"
                    >
                      <MapPin className="size-3.5 text-amber-600 shrink-0" />
                      <span>Add address ({MAP_PROVIDERS[preferredMap].badge})</span>
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 justify-end">
                    <div className="inline-flex items-center gap-1 bg-slate-100/90 rounded-lg p-0.5 border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => updatePortions(row.id, -1)}
                        disabled={row.portions <= 1}
                        className="grid size-6 place-items-center rounded bg-white text-slate-600 disabled:opacity-30"
                        title="Decrease portions"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className={`px-1.5 text-xs font-bold ${row.portions > 1 ? "text-amber-900 font-extrabold" : "text-slate-700"}`}>
                        {row.portions > 1 ? `🍲 ${row.portions}` : `${row.portions}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePortions(row.id, 1)}
                        className="grid size-6 place-items-center rounded bg-white text-slate-600"
                        title="Increase portions"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={row.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="cursor-pointer">
                          <DriverBadge driver={row.driver} vehicle={driverMap.get((row.driver || "").toLowerCase())?.vehicle} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Assign Driver</p>
                        {allDrivers.map(d => {
                          const dObj = driverMap.get(d.toLowerCase());
                          return (
                            <DropdownMenuItem key={d} onClick={() => updateDriver(row.id, d)} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <VehicleIcon vehicle={dObj?.vehicle} className="size-3 text-purple-600" />
                                <span>{d}</span>
                              </div>
                              {row.driver === d && <Check className="size-3.5 text-purple-600" />}
                            </DropdownMenuItem>
                          );
                        })}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updateDriver(row.id, "")} className="text-xs text-rose-700">
                          Unassigned
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(row.id, row.status === "delivered" ? "planned" : "delivered")}>
                    {row.status === "delivered" ? <CircleDot /> : <Check />}
                    {row.status === "delivered" ? "Reopen" : "Delivered"}
                  </Button>
                </div>
              </article>
            ))}
          </div>

          {!visible.length && (
            <div className="grid min-h-64 place-items-center px-5 py-12 text-center">
              <div>
                <Search className="mx-auto size-8 text-slate-300" />
                <p className="mt-3 font-semibold">No matching recipients</p>
                <p className="mt-1 text-sm text-slate-500">Clear a filter or add a new household.</p>
              </div>
            </div>
          )}
          <ListPagination
            page={safePage}
            pageSize={pageSize}
            total={visible.length}
            onPageChange={nextPage => {
              setPage(nextPage);
              document.querySelector("[aria-label='Delivery list results']")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onPageSizeChange={size => { setPageSize(size); setPage(1); }}
          />
        </section>
      </div>

      <MapModal
        item={activeMapTarget}
        preferredMap={preferredMap}
        allDrivers={allDrivers}
        onSelectPreferred={handleSelectPreferredMap}
        onClose={() => setMapModalTarget(null)}
        onEditAddress={(target) => {
          setMapModalTarget(null);
          setQuickAddressTarget(target);
        }}
        onUpdateStatus={updateStatus}
        onUpdateDriver={updateDriver}
      />
      <QuickAddressDialog
        key={quickAddressTarget?.id ?? "closed-address"}
        item={quickAddressTarget}
        preferredMap={preferredMap}
        onSelectPreferred={handleSelectPreferredMap}
        onClose={() => setQuickAddressTarget(null)}
        onSave={updateAddress}
      />
      <RecipientDialog
        item={editing}
        groups={groups}
        allDrivers={allDrivers}
        onChange={setEditing}
        onClose={() => setEditing(null)}
        onSubmit={saveRecipient}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This removes the household entry from your list on this device.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const deleted = deleteTarget;
                if (deleted) {
                  setRows(current => current.filter(row => row.id !== deleted.id));
                  toast.success(`${deleted.name} deleted.`, {
                    action: { label: "Undo", onClick: () => setRows(current => [...current, deleted]) },
                  });
                }
                setDeleteTarget(null);
              }}
              className="bg-rose-700 hover:bg-rose-800"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DriverManagementDialog
        open={isDriverPanelOpen}
        drivers={drivers}
        driverStats={driverStats}
        onClose={() => setIsDriverPanelOpen(false)}
        onAddDriver={() => setEditingDriver(newDriver())}
        onEditDriver={(driver) => setEditingDriver(driver)}
        onDeleteDriver={(driver) => setDeleteDriverTarget(driver)}
        onSelectDriverFilter={(name) => {
          setDriverFilter(name);
          setIsDriverPanelOpen(false);
        }}
        onCopyRoute={copyDriverRoute}
        onShareWhatsapp={(driverName, driverPhone) => shareDriverRouteWhatsapp(driverName, driverPhone)}
      />
      <DriverFormDialog
        key={editingDriver?.id ?? "closed-driver"}
        driver={editingDriver}
        onClose={() => setEditingDriver(null)}
        onSave={handleSaveDriver}
      />
      <DriverDeleteDialog
        driver={deleteDriverTarget}
        assignedCount={deleteDriverTarget ? (driverStats.drivers[deleteDriverTarget.name]?.count || 0) : 0}
        onClose={() => setDeleteDriverTarget(null)}
        onConfirm={handleDeleteDriver}
      />
      <CsvImportDialog
        rows={pendingImport}
        currentCount={rows.length}
        onClose={() => setPendingImport(null)}
        onConfirm={applyImport}
      />
      <MobileDock
        onAdd={() => setEditing(newRecipient(GROUPS[0]))}
        onDrivers={() => setIsDriverPanelOpen(true)}
        onSearch={() => {
          filtersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          window.setTimeout(() => searchRef.current?.focus(), 350);
        }}
        onFilters={() => setMobileFiltersOpen(true)}
      />
      <MobileFiltersDrawer
        open={mobileFiltersOpen}
        values={{ area: areaFilter, zone: zoneFilter, group, driver: driverFilter, status, address: addressFilter }}
        groups={groups}
        drivers={allDrivers}
        zones={availableZones}
        resultCount={visible.length}
        activeCount={activeFilterCount}
        onOpenChange={setMobileFiltersOpen}
        onChange={updateMobileFilter}
        onReset={resetFilters}
      />
      <Toaster position="top-center" richColors closeButton />
    </main>
  );
}

function MapMenu({
  query,
  preferredMap,
  onSelectPreferred,
  onOpenModal,
}: {
  query: string;
  preferredMap: MapProvider;
  onSelectPreferred: (map: MapProvider) => void;
  onOpenModal?: () => void;
}) {
  const currentProvider = MAP_PROVIDERS[preferredMap] || MAP_PROVIDERS.eatolls;
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white/90 shadow-2xs">
      <button
        type="button"
        onClick={onOpenModal ? onOpenModal : () => window.open(currentProvider.getUrl(query), "_blank")}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#087e8b] hover:bg-cyan-50/70 rounded-l-lg transition-colors"
        title="Open map & navigation modal"
      >
        <Compass className="size-3" />
        <span>{currentProvider.short}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="border-l border-slate-200 px-1 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-r-lg"
            title="Choose map action or provider"
          >
            <ChevronDown className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {onOpenModal && (
            <>
              <DropdownMenuItem onClick={onOpenModal} className="font-semibold text-[#087e8b]">
                <Compass className="size-3.5 mr-1 text-[#087e8b]" />
                <span>Open in Map Modal</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Open directly in new tab</p>
          {(Object.keys(MAP_PROVIDERS) as MapProvider[]).map((key) => {
            const provider = MAP_PROVIDERS[key];
            return (
              <DropdownMenuItem key={key} asChild>
                <a href={provider.getUrl(query)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-xs">
                  <span>{provider.label}</span>
                  <ExternalLink className="size-3 text-slate-400" />
                </a>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <p className="px-2 py-1 text-[10px] font-medium text-slate-400">Set as default map</p>
          {(Object.keys(MAP_PROVIDERS) as MapProvider[]).map((key) => {
            const provider = MAP_PROVIDERS[key];
            const isSelected = preferredMap === key;
            return (
              <DropdownMenuItem key={`def-${key}`} onClick={() => onSelectPreferred(key)} className="flex items-center justify-between text-xs">
                <span className={isSelected ? "font-bold text-[#087e8b]" : ""}>{provider.short}</span>
                {isSelected && <Check className="size-3.5 text-[#087e8b]" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MapModal({
  item,
  preferredMap,
  allDrivers = DEFAULT_DRIVERS,
  onSelectPreferred,
  onClose,
  onEditAddress,
  onUpdateStatus,
  onUpdateDriver,
}: {
  item: Recipient | null;
  preferredMap: MapProvider;
  allDrivers?: readonly string[] | string[];
  onSelectPreferred: (map: MapProvider) => void;
  onClose: () => void;
  onEditAddress: (item: Recipient) => void;
  onUpdateStatus: (id: string, status: RecipientStatus) => void;
  onUpdateDriver?: (id: string, driver: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!item) return null;

  const address = (item.address || "").trim();
  const area = item.area || "Hulhumalé";
  const query = address ? `${address}, ${area}` : `${item.name}, ${area}`;
  const encodedQuery = encodeURIComponent(`${query} Maldives`);
  const embedUrl = `https://maps.google.com/maps?q=${encodedQuery}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  const preferred = MAP_PROVIDERS[preferredMap] || MAP_PROVIDERS.eatolls;

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function copyPhone() {
    if (!item?.phone) return;
    navigator.clipboard.writeText(item.phone);
    setCopiedPhone(true);
    toast.success("Phone number copied");
    setTimeout(() => setCopiedPhone(false), 2000);
  }

  const cleanPhone = item.phone ? item.phone.replace(/[^0-9]/g, "") : "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/960${cleanPhone.startsWith("960") ? cleanPhone.slice(3) : cleanPhone}`
    : null;

  return (
    <Dialog open={!!item} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl p-0 sm:max-w-xl border-slate-200">
        <div className="bg-gradient-to-br from-[#082f49] via-[#0c4a6e] to-[#087e8b] p-5 sm:p-6 text-white rounded-t-3xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pr-6">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-cyan-200">
                  {item.group}
                </span>
                <AreaBadge area={item.area || "Hulhumalé"} />
                <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-200">
                  🍲 {item.portions} portion{item.portions === 1 ? "" : "s"}
                </span>
                <DriverBadge driver={item.driver} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
                {item.name}
              </h2>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-cyan-100/70 font-medium">Status:</span>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map(s => {
                  const meta = STATUS_META[s];
                  const active = item.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        onUpdateStatus(item.id, s);
                        toast.success(`Status set to ${meta.label}`);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                        active
                          ? "bg-white text-[#082f49] shadow-sm font-bold"
                          : "bg-white/15 text-white hover:bg-white/25"
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {onUpdateDriver && (
              <div className="flex items-center gap-1.5">
                <span className="text-cyan-100/70 font-medium">Driver:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-lg bg-white/20 hover:bg-white/30 px-2.5 py-1 text-xs font-semibold text-white inline-flex items-center gap-1">
                      <Car className="size-3" />
                      <span>{item.driver || "Assign"}</span>
                      <ChevronDown className="size-2.5 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    {allDrivers.map(d => (
                      <DropdownMenuItem
                        key={d}
                        onClick={() => onUpdateDriver(item.id, d)}
                        className="text-xs"
                      >
                        {d}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onUpdateDriver(item.id, "")}
                      className="text-xs text-rose-700"
                    >
                      Unassigned
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#087e8b]/10 text-[#087e8b] mt-0.5">
                  <MapPin className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Delivery Address</p>
                  <p className="text-base font-semibold text-slate-900 break-words mt-0.5">
                    {address || "No address entered yet"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {address && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={copyAddress}
                    className="h-8 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    title="Copy address"
                  >
                    {copied ? <CheckCheck className="size-3.5 text-emerald-600 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onEditAddress(item)}
                  className="h-8 text-xs text-[#087e8b] hover:bg-cyan-50"
                  title="Edit address"
                >
                  <Pencil className="size-3.5 mr-1" />
                  Edit
                </Button>
              </div>
            </div>

            {item.phone && (
              <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 font-medium">{item.phone}</span>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${item.phone}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  >
                    <Phone className="size-3" />
                    Call
                  </a>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 font-semibold text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
                    >
                      <MessageSquare className="size-3" />
                      WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={copyPhone}
                    className="rounded-lg bg-slate-100 px-2 py-1 font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                    title="Copy phone number"
                  >
                    {copiedPhone ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            {item.notes && (
              <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                <span className="font-semibold text-amber-900 block mb-0.5">Notes:</span>
                <p className="text-amber-800">{item.notes}</p>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
            <div className="flex items-center justify-between bg-slate-200/70 px-3 py-1.5 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <Compass className="size-3.5 text-[#087e8b]" />
                Live Map Preview
              </span>
              <span className="text-[11px] text-slate-400">Interactive</span>
            </div>
            {address ? (
              <iframe
                title={`Map preview for ${item.name}`}
                src={embedUrl}
                className="h-56 sm:h-64 w-full border-0 bg-slate-100"
                loading="lazy"
                allowFullScreen
              />
            ) : (
              <div className="grid h-44 place-items-center text-center p-4 text-slate-400 text-xs">
                <div>
                  <MapPin className="mx-auto size-8 text-slate-300 mb-1" />
                  <p>No address specified yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditAddress(item)}
                    className="mt-2 text-xs"
                  >
                    Add Address
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Open in App / Navigation
              </p>
              <span className="text-[11px] text-slate-400">Opens app on phone or new tab</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <a
                href={MAP_PROVIDERS.eatolls.getUrl(query)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-cyan-100 text-[#087e8b] transition-all text-center group shadow-2xs"
                title="Open on Eatolls Maldives house directory"
              >
                <Globe className="size-5 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold leading-tight">Eatolls</span>
                <span className="text-[10px] text-[#087e8b]/70">Maldives Map</span>
              </a>

              <a
                href={MAP_PROVIDERS.google.getUrl(query)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 transition-all text-center group shadow-2xs"
                title="Open in Google Maps app / web"
              >
                <Compass className="size-5 mb-1 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold leading-tight">Google Maps</span>
                <span className="text-[10px] text-blue-600/70">Turn-by-turn</span>
              </a>

              <a
                href={MAP_PROVIDERS.apple.getUrl(query)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-all text-center group shadow-2xs"
                title="Open in Apple Maps on iPhone / Mac"
              >
                <Navigation className="size-5 mb-1 text-slate-700 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold leading-tight">Apple Maps</span>
                <span className="text-[10px] text-slate-500">iPhone / Mac</span>
              </a>

              <a
                href={MAP_PROVIDERS.waze.getUrl(query)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-700 transition-all text-center group shadow-2xs"
                title="Open in Waze navigation app"
              >
                <Navigation className="size-5 mb-1 text-sky-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold leading-tight">Waze</span>
                <span className="text-[10px] text-sky-600/70">Live Traffic</span>
              </a>
            </div>
          </div>

          <div className="rounded-xl border bg-slate-50/80 p-2.5 flex items-center justify-between text-xs text-slate-600">
            <span>Default Navigation App:</span>
            <div className="flex items-center gap-1">
              {(Object.keys(MAP_PROVIDERS) as MapProvider[]).map((key) => {
                const isSelected = preferredMap === key;
                return (
                  <button
                    type="button"
                    key={`modal-pref-${key}`}
                    onClick={() => onSelectPreferred(key)}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-[#087e8b] text-white shadow-xs font-bold"
                        : "bg-white text-slate-600 border hover:bg-slate-100"
                    }`}
                  >
                    {MAP_PROVIDERS[key].short}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2 flex-row gap-2 sm:justify-between items-center">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl flex-1 sm:flex-none">
              Close
            </Button>
            <a
              href={preferred.getUrl(query)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087e8b] hover:bg-[#076c77] px-4 py-2 text-sm font-semibold text-white transition-colors flex-1 sm:flex-none shadow-sm"
            >
              <Compass className="size-4" />
              <span>Launch {preferred.short}</span>
              <ExternalLink className="size-3 opacity-70" />
            </a>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function SummaryCard({ icon, label, value, hint, alert, onClick }: { icon: React.ReactNode; label: string; value: number; hint: string; alert?: boolean; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return <Tag onClick={onClick} className="print-card glass rounded-[24px] border border-white p-6 text-left shadow-[0_14px_42px_rgba(8,47,73,.07)]"><div className="flex items-start justify-between"><span className={`grid size-10 place-items-center rounded-xl ${alert ? "bg-amber-50 text-amber-700" : "bg-cyan-50 text-[#087e8b]"}`}>{icon}</span><span className="font-display text-4xl font-semibold text-[#0b3b52]">{value}</span></div><p className="mt-6 font-semibold text-slate-800">{label}</p><p className="mt-1 text-sm text-slate-500">{hint}</p></Tag>;
}

function RowMenu({ edit, remove }: { edit: () => void; remove: () => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost"><MoreHorizontal /><span className="sr-only">Recipient actions</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={edit}><Pencil />Edit</DropdownMenuItem><DropdownMenuItem onClick={remove} className="text-rose-700"><Trash2 />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}

function QuickAddressDialog({
  item,
  preferredMap,
  onSelectPreferred,
  onClose,
  onSave,
}: {
  item: Recipient | null;
  preferredMap: MapProvider;
  onSelectPreferred: (map: MapProvider) => void;
  onClose: () => void;
  onSave: (id: string, address: string) => void;
}) {
  const [address, setAddress] = useState(item?.address || "");

  if (!item) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    onSave(item.id, address);
    onClose();
  }

  function appendPreset(prefix: string) {
    setAddress(current => {
      if (!current.trim()) return prefix;
      const matched = MALDIVES_PRESETS.find(p => current.startsWith(p.prefix));
      if (matched) return current.replace(matched.prefix, prefix);
      return `${prefix}${current}`;
    });
  }

  const query = (address || item.name).trim();

  return (
    <Dialog open={!!item} onOpenChange={open => !open && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-[#087e8b]">
              <MapPin className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-semibold text-[#082f49]">Address for {item.name}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {item.group} • {item.portions} portion{item.portions === 1 ? "" : "s"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="quick-address-input" className="text-sm font-semibold text-slate-700">
                House / Building / Flat
              </label>
              <span className="text-[11px] text-slate-400">Search on:</span>
            </div>

            <Input
              id="quick-address-input"
              autoFocus
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. H. Aabaadhu, Hiyaa Flat H7-12-04, Villimalé..."
              className="h-11 rounded-xl bg-white text-base"
            />

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <a
                href={MAP_PROVIDERS.eatolls.getUrl(query)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50/80 px-2.5 py-1 text-xs font-semibold text-[#087e8b] hover:bg-cyan-100 transition-colors"
                title="Search on Eatolls Maldives map"
              >
                <Globe className="size-3.5" />
                <span>Eatolls</span>
                <ExternalLink className="size-2.5 opacity-60" />
              </a>

              <a
                href={MAP_PROVIDERS.google.getUrl(query)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                title="Search on Google Maps"
              >
                <Compass className="size-3.5 text-blue-600" />
                <span>Google Maps</span>
                <ExternalLink className="size-2.5 opacity-60" />
              </a>

              <a
                href={MAP_PROVIDERS.apple.getUrl(query)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                title="Search on Apple Maps"
              >
                <Navigation className="size-3.5 text-slate-700" />
                <span>Apple Maps</span>
                <ExternalLink className="size-2.5 opacity-60" />
              </a>

              <a
                href={MAP_PROVIDERS.waze.getUrl(query)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                title="Search on Waze"
              >
                <Navigation className="size-3.5 text-cyan-600" />
                <span>Waze</span>
                <ExternalLink className="size-2.5 opacity-60" />
              </a>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Quick Maldivian Location Tags:</p>
            <div className="flex flex-wrap gap-1.5">
              {MALDIVES_PRESETS.map(preset => (
                <button
                  type="button"
                  key={preset.label}
                  onClick={() => appendPreset(preset.prefix)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-cyan-50 hover:border-cyan-300 hover:text-[#087e8b] transition-all"
                  title={preset.desc}
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-slate-50/70 p-2.5 flex items-center justify-between text-xs text-slate-600">
            <span>Default Map App:</span>
            <div className="flex items-center gap-1">
              {(Object.keys(MAP_PROVIDERS) as MapProvider[]).map((key) => {
                const isSelected = preferredMap === key;
                return (
                  <button
                    type="button"
                    key={`pref-${key}`}
                    onClick={() => onSelectPreferred(key)}
                    className={`rounded-md px-2 py-0.5 font-medium transition-all ${
                      isSelected
                        ? "bg-[#087e8b] text-white shadow-xs font-bold"
                        : "bg-white text-slate-600 border hover:bg-slate-100"
                    }`}
                  >
                    {MAP_PROVIDERS[key].short}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl bg-[#087e8b] hover:bg-[#076c77]">
              Save Address
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecipientDialog({
  item,
  groups,
  allDrivers = DEFAULT_DRIVERS,
  onChange,
  onClose,
  onSubmit,
}: {
  item: Recipient | null;
  groups: string[];
  allDrivers?: readonly string[] | string[];
  onChange: (item: Recipient | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const set = (field: keyof Recipient, value: string | number) => item && onChange({ ...item, [field]: value });
  const query = (item?.address || item?.name || "").trim();

  function appendPreset(prefix: string) {
    if (!item) return;
    const current = item.address || "";
    if (!current.trim()) {
      set("address", prefix);
      return;
    }
    const matched = MALDIVES_PRESETS.find(p => current.startsWith(p.prefix));
    if (matched) {
      set("address", current.replace(matched.prefix, prefix));
    } else {
      set("address", `${prefix}${current}`);
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Recipient details</DialogTitle>
          <DialogDescription>One entry can represent one person or an entire household.</DialogDescription>
        </DialogHeader>
        {item && (
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Name or household">
              <Input autoFocus required value={item.name} onChange={event => set("name", event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Group">
                <Select value={item.group} onValueChange={value => set("group", value)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{groups.map(group => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Island / Area">
                <Select value={item.area || "Hulhumalé"} onValueChange={value => set("area", value as RecipientArea)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AREAS.map(area => (
                      <SelectItem key={area} value={area}>
                        <div className="flex items-center gap-1.5">
                          <span className={`size-2 rounded-full ${AREA_META[area].dot}`} />
                          <span>{area}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Portions (Bondibai)">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => set("portions", Math.max(1, (Number(item.portions) || 1) - 1))}
                    disabled={(Number(item.portions) || 1) <= 1}
                    className="size-9 rounded-xl shrink-0"
                    title="Decrease portions"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={item.portions}
                    onChange={event => set("portions", Math.max(1, Number(event.target.value) || 1))}
                    className="text-center font-bold text-base h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => set("portions", (Number(item.portions) || 1) + 1)}
                    className="size-9 rounded-xl shrink-0"
                    title="Increase portions (+1 Bondibai)"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </Field>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Address</span>
                <span className="text-[11px] text-slate-400">Search on:</span>
              </div>
              <Input
                value={item.address}
                onChange={event => set("address", event.target.value)}
                placeholder="House, apartment, tower or island (e.g. H. Aabaadhu, Hiyaa H8-05)"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <a
                  href={MAP_PROVIDERS.eatolls.getUrl(query)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-cyan-200 bg-cyan-50/80 px-2 py-0.5 text-xs font-semibold text-[#087e8b] hover:bg-cyan-100 transition-colors"
                >
                  <Globe className="size-3" />
                  <span>Eatolls</span>
                  <ExternalLink className="size-2.5 opacity-60" />
                </a>
                <a
                  href={MAP_PROVIDERS.google.getUrl(query)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Compass className="size-3 text-blue-600" />
                  <span>Google</span>
                  <ExternalLink className="size-2.5 opacity-60" />
                </a>
                <a
                  href={MAP_PROVIDERS.apple.getUrl(query)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Navigation className="size-3" />
                  <span>Apple</span>
                  <ExternalLink className="size-2.5 opacity-60" />
                </a>
                <a
                  href={MAP_PROVIDERS.waze.getUrl(query)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Navigation className="size-3 text-cyan-600" />
                  <span>Waze</span>
                  <ExternalLink className="size-2.5 opacity-60" />
                </a>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Quick tags:</span>
                {MALDIVES_PRESETS.map(preset => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => appendPreset(preset.prefix)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-cyan-50 hover:border-cyan-300 hover:text-[#087e8b] transition-all"
                    title={preset.desc}
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Phone">
                <Input inputMode="tel" value={item.phone} onChange={event => set("phone", event.target.value)} />
              </Field>
              <Field label="Assigned Driver">
                <Select value={item.driver || "Unassigned"} onValueChange={value => set("driver", value === "Unassigned" ? "" : value)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unassigned">Unassigned</SelectItem>
                    {allDrivers.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={item.status} onValueChange={value => set("status", value)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map(status => <SelectItem key={status} value={status}>{STATUS_META[status].label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Notes">
              <Textarea value={item.notes} onChange={event => set("notes", event.target.value)} placeholder="Delivery instructions or anything to remember" />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save recipient</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>; }

function DriverManagementDialog({
  open,
  drivers,
  driverStats,
  onClose,
  onAddDriver,
  onEditDriver,
  onDeleteDriver,
  onSelectDriverFilter,
  onCopyRoute,
  onShareWhatsapp,
}: {
  open: boolean;
  drivers: Driver[];
  driverStats: {
    unassignedCount: number;
    unassignedPortions: number;
    drivers: Record<string, { count: number; portions: number; delivered: number; pending: number }>;
  };
  onClose: () => void;
  onAddDriver: () => void;
  onEditDriver: (driver: Driver) => void;
  onDeleteDriver: (driver: Driver) => void;
  onSelectDriverFilter: (name: string) => void;
  onCopyRoute: (name: string) => void;
  onShareWhatsapp: (name: string, phone?: string) => void;
}) {
  const totalAssignedPortions = Object.values(driverStats.drivers).reduce((sum, d) => sum + d.portions, 0);
  const totalDelivered = Object.values(driverStats.drivers).reduce((sum, d) => sum + d.delivered, 0);

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl p-0 sm:max-w-3xl border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 p-5 sm:p-6 text-white rounded-t-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-white/15 text-white shadow-inner">
                <Users className="size-6" />
              </span>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Driver Fleet & Route Dispatch
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-purple-200">
                  Manage drivers, vehicles, contact info, and delivery dispatch routes
                </DialogDescription>
              </div>
            </div>

            <Button
              onClick={onAddDriver}
              className="h-9 gap-1.5 rounded-xl bg-white text-purple-900 hover:bg-purple-50 font-semibold shadow-md shrink-0"
            >
              <UserPlus className="size-4 text-purple-700" />
              <span>Add New Driver</span>
            </Button>
          </div>

          {/* Quick Fleet Metrics Bar */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 pt-4 border-t border-white/15 text-xs">
            <div className="rounded-xl bg-white/10 p-2.5">
              <span className="text-purple-200 block text-[11px]">Total Drivers</span>
              <span className="text-lg font-bold text-white">{drivers.length}</span>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <span className="text-purple-200 block text-[11px]">Active On-Duty</span>
              <span className="text-lg font-bold text-emerald-300">
                {drivers.filter(d => d.active !== false).length}
              </span>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <span className="text-purple-200 block text-[11px]">Assigned Portions</span>
              <span className="text-lg font-bold text-white">
                {totalAssignedPortions} 🍲 <span className="text-xs font-normal text-purple-200">({totalDelivered} done)</span>
              </span>
            </div>
            <div className="rounded-xl bg-amber-500/20 border border-amber-400/30 p-2.5">
              <span className="text-amber-200 block text-[11px]">Unassigned</span>
              <span className="text-lg font-bold text-amber-300">
                {driverStats.unassignedCount} <span className="text-xs font-normal text-amber-200">({driverStats.unassignedPortions} 🍲)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Driver List */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Registered Drivers ({drivers.length})
            </h3>
            <span className="text-xs text-slate-400">Tap cards to dispatch routes or edit details</span>
          </div>

          {!drivers.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <Users className="mx-auto size-10 text-slate-300" />
              <p className="mt-2 font-semibold text-slate-700">No drivers added yet</p>
              <p className="text-xs text-slate-400 mt-1">Add drivers to assign households and dispatch routes via WhatsApp.</p>
              <Button onClick={onAddDriver} size="sm" className="mt-4 rounded-xl bg-purple-700 text-white">
                <Plus className="size-4 mr-1" /> Add First Driver
              </Button>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {drivers.map(driver => {
                const stat = driverStats.drivers[driver.name] || { count: 0, portions: 0, delivered: 0, pending: 0 };
                const percent = stat.count ? Math.round((stat.delivered / stat.count) * 100) : 0;
                const isComplete = stat.count > 0 && stat.delivered === stat.count;

                return (
                  <div
                    key={driver.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-purple-300 transition-all"
                  >
                    <div>
                      {/* Driver Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <span className="grid size-10 place-items-center rounded-xl bg-purple-100 text-purple-700 shrink-0">
                            <VehicleIcon vehicle={driver.vehicle} className="size-5" />
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-slate-900 text-base">{driver.name}</h4>
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                                driver.active !== false
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}>
                                {driver.active !== false ? "Active" : "Off-Duty"}
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                              <span className="font-medium text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100 text-[11px]">
                                {driver.vehicle || "Motorcycle"}
                              </span>
                              {driver.area && (
                                <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                                  📍 {driver.area}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Edit & Delete Action Menu */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onEditDriver(driver)}
                            className="size-8 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50"
                            title="Edit Driver"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onDeleteDriver(driver)}
                            className="size-8 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50"
                            title="Delete Driver"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Phone & Notes */}
                      <div className="mt-3 space-y-1.5 text-xs">
                        {driver.phone ? (
                          <div className="flex items-center justify-between text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                            <span className="flex items-center gap-1.5 font-mono font-medium">
                              <Phone className="size-3 text-purple-600" />
                              {driver.phone}
                            </span>
                            <a
                              href={`tel:${driver.phone}`}
                              className="text-[11px] font-semibold text-purple-700 hover:underline"
                            >
                              Call
                            </a>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic px-1">
                            No phone number added
                          </div>
                        )}

                        {driver.notes && (
                          <p className="text-[11px] text-slate-500 bg-purple-50/50 p-2 rounded-lg border border-purple-100/50 italic line-clamp-2">
                            📝 {driver.notes}
                          </p>
                        )}
                      </div>

                      {/* Realtime Delivery Progress Box */}
                      <div className="mt-3 rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Households</span>
                              <span className="font-bold text-slate-800">{stat.count}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Portions</span>
                              <span className="font-bold text-amber-700">🍲 {stat.portions}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Delivered</span>
                              <span className="font-bold text-emerald-700">{stat.delivered}/{stat.count}</span>
                            </div>
                          </div>
                          <span className={`text-xs font-bold ${isComplete ? "text-emerald-700 font-extrabold" : "text-purple-700"}`}>
                            {percent}%
                          </span>
                        </div>
                        <Progress value={percent} className="h-2 bg-slate-200" />
                      </div>
                    </div>

                    {/* Driver Card Footer Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectDriverFilter(driver.name)}
                        className="h-8 px-2 text-[11px] rounded-lg border-slate-200 text-slate-700 hover:bg-purple-50 hover:text-purple-900"
                        title="Focus view on this driver's stops"
                      >
                        <Eye className="size-3 mr-1" /> View List
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCopyRoute(driver.name)}
                        className="h-8 px-2 text-[11px] rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100"
                        title="Copy route text"
                      >
                        <Copy className="size-3 mr-1" /> Copy
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onShareWhatsapp(driver.name, driver.phone)}
                        className="h-8 px-2 text-[11px] rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shadow-2xs"
                        title="Send route directly to Driver WhatsApp"
                      >
                        <Send className="size-3 mr-1" /> WhatsApp
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-3xl">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Close Panel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DriverFormDialog({
  driver,
  onClose,
  onSave,
}: {
  driver: Driver | null;
  onClose: () => void;
  onSave: (driver: Driver) => void;
}) {
  const [formData, setFormData] = useState<Driver | null>(driver);

  if (!formData) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formData || !formData.name.trim()) {
      toast.error("Driver name is required.");
      return;
    }
    onSave(formData);
  }

  const setField = (field: keyof Driver, value: unknown) => {
    setFormData(curr => (curr ? { ...curr, [field]: value } : null));
  };

  const VEHICLES: DriverVehicle[] = ["Motorcycle", "Car", "Van", "Pickup", "Bicycle", "Other"];

  return (
    <Dialog open={!!driver} onOpenChange={open => !open && onClose()}>
      <DialogContent className="rounded-3xl sm:max-w-md border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-purple-100 text-purple-700">
              <VehicleIcon vehicle={formData.vehicle} className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {driver?.name ? `Edit ${driver.name}` : "Add New Delivery Driver"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Set vehicle, phone number, and dispatch area for this driver
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          <Field label="Driver Name / Identifier">
            <Input
              autoFocus
              required
              value={formData.name}
              onChange={e => setField("name", e.target.value)}
              placeholder="e.g. Ali (Motorcycle), Driver 5, Ahmed..."
              className="h-10 rounded-xl"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle Type">
              <Select
                value={formData.vehicle || "Motorcycle"}
                onValueChange={val => setField("vehicle", val as DriverVehicle)}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLES.map(v => (
                    <SelectItem key={v} value={v}>
                      <div className="flex items-center gap-2">
                        <VehicleIcon vehicle={v} className="size-3.5" />
                        <span>{v}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Island / Area Focus">
              <Select
                value={formData.area || "All Areas"}
                onValueChange={val => setField("area", val as RecipientArea | "All Areas")}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Areas">All Areas</SelectItem>
                  {AREAS.map(a => (
                    <SelectItem key={a} value={a}>
                      <div className="flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${AREA_META[a].dot}`} />
                        <span>{a}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Phone">
              <Input
                inputMode="tel"
                value={formData.phone || ""}
                onChange={e => setField("phone", e.target.value)}
                placeholder="e.g. 7912345 or 9123456"
                className="h-10 rounded-xl font-mono text-sm"
              />
            </Field>

            <Field label="Duty Status">
              <Select
                value={formData.active !== false ? "active" : "off-duty"}
                onValueChange={val => setField("active", val === "active")}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">🟢 Active (On Duty)</SelectItem>
                  <SelectItem value="off-duty">⚪ Off Duty</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Vehicle Plate / Shift Notes">
            <Textarea
              value={formData.notes || ""}
              onChange={e => setField("notes", e.target.value)}
              placeholder="e.g. Plate AB1A-1234, available after 2 PM, handles Hulhumalé Phase 2..."
              className="rounded-xl text-xs"
              rows={2}
            />
          </Field>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold">
              Save Driver
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DriverDeleteDialog({
  driver,
  assignedCount,
  onClose,
  onConfirm,
}: {
  driver: Driver | null;
  assignedCount: number;
  onClose: () => void;
  onConfirm: (driver: Driver) => void;
}) {
  if (!driver) return null;

  return (
    <AlertDialog open={!!driver} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-rose-700">Delete driver &quot;{driver.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-slate-600">
            <span>This will remove this driver from your delivery fleet list.</span>
            {assignedCount > 0 && (
              <span className="block font-medium text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs">
                ⚠️ <strong>{assignedCount} household{assignedCount > 1 ? "s are" : " is"} currently assigned to this driver.</strong> Deleting the driver will safely mark them as <em>Unassigned</em>.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(driver)}
            className="bg-rose-700 hover:bg-rose-800 text-white font-semibold"
          >
            Delete Driver
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
