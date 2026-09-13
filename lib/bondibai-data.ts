export const GROUPS = [
  "Shaufa Family",
  "Shaufa Family Friend",
  "Moho Friends",
  "Shaufa Friends",
  "Moho Kaafa Family",
  "Moho Maama Family",
  "Moho Neighbours",
] as const;

export type RecipientArea = "Malé" | "Hulhumalé" | "Villimalé";
export const AREAS: RecipientArea[] = ["Malé", "Hulhumalé", "Villimalé"];

export const AREA_META: Record<RecipientArea, { label: string; tone: string; dot: string; colorHint: string }> = {
  "Malé": {
    label: "Malé",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-500",
    colorHint: "Red in sheet",
  },
  "Hulhumalé": {
    label: "Hulhumalé",
    tone: "bg-cyan-50 text-cyan-800 border-cyan-200",
    dot: "bg-cyan-500",
    colorHint: "Blank in sheet",
  },
  "Villimalé": {
    label: "Villimalé",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    colorHint: "Green in sheet",
  },
};

export type RecipientStatus = "planned" | "packed" | "delivered" | "on-hold" | "not-picking-up";

export type Recipient = {
  id: string;
  name: string;
  group: string;
  area: RecipientArea;
  address: string;
  phone: string;
  driver?: string;
  portions: number;
  status: RecipientStatus;
  notes: string;
  updatedAt: string;
};

export type DriverVehicle = "Motorcycle" | "Car" | "Van" | "Pickup" | "Bicycle" | "Other";

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  vehicle?: DriverVehicle;
  area?: RecipientArea | "All Areas";
  notes?: string;
  active?: boolean;
  createdAt?: string;
}

export const INITIAL_DRIVERS: Driver[] = [
  { id: "driver-1", name: "Driver 1", phone: "", vehicle: "Motorcycle", area: "All Areas", active: true },
  { id: "driver-2", name: "Driver 2", phone: "", vehicle: "Motorcycle", area: "All Areas", active: true },
  { id: "driver-3", name: "Driver 3", phone: "", vehicle: "Car", area: "All Areas", active: true },
  { id: "driver-4", name: "Driver 4", phone: "", vehicle: "Car", area: "All Areas", active: true },
];

export function newDriver(name: string = ""): Driver {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    phone: "",
    vehicle: "Motorcycle",
    area: "All Areas",
    notes: "",
    active: true,
    createdAt: new Date().toISOString(),
  };
}

export const DEFAULT_DRIVERS = ["Driver 1", "Driver 2", "Driver 3", "Driver 4"] as const;

export function getSubZone(address: string, area: RecipientArea): string {
  const addr = (address || "").trim().toLowerCase();
  if (addr.startsWith("h.") || addr.startsWith("h ") || addr.includes("henveiru")) return "Henveiru (H.)";
  if (addr.startsWith("m.") || addr.startsWith("m ") || addr.includes("machangoalhi")) return "Machangoalhi (M.)";
  if (addr.startsWith("g.") || addr.startsWith("g ") || addr.includes("galolhu")) return "Galolhu (G.)";
  if (addr.startsWith("ma.") || addr.startsWith("ma ") || addr.includes("maafannu")) return "Maafannu (Ma.)";
  if (addr.includes("hiyaa") || /h[1-9]/.test(addr)) return "Hiyaa Flats";
  if (addr.includes("vinares") || /v[1-9]/.test(addr)) return "Vinares Flats";
  if (addr.includes("phase 2") || addr.includes("phase ii") || addr.includes("phase2")) return "Hulhumalé Phase 2";
  if (addr.includes("phase 1") || addr.includes("phase i") || addr.includes("phase1")) return "Hulhumalé Phase 1";
  if (area === "Villimalé" || addr.includes("villi")) return "Villimalé";
  if (area === "Malé") return "Malé";
  if (area === "Hulhumalé") return "Hulhumalé";
  return "General";
}

// Raw data mapped directly from Google Sheet screenshot:
// [Group, Hulhumale (Blank), Male (Red), Villimale (Green)]
const raw: Array<[string, string[], string[], string[]]> = [
  [
    "Shaufa Family",
    [
      "Rafiu & Shee",
      "Shabab & Phari",
      "Basheeratha & family",
      "Haseenaththa",
      "Ameeza & family",
      "Ameega & family",
      "Azhaan",
      "Azeema & Mamsha",
      "Ali Haaris",
      "Nahula",
      "Zubeydaatha",
    ],
    [
      "Suha & Munshid",
      "Ahmed Manik & Fazeelaththa",
      "Haaris & Liya",
    ],
    [
      "Misriyya — Villingili",
      "Guraishaththa - Villingili",
      "Hawaaththa — Villingili",
    ],
  ],
  [
    "Shaufa Family Friend",
    [
      "Azlifa",
      "Mareena",
      "Rizza",
      "Rafiu's mom & family",
      "Ameena",
      "Saudhiyya",
      "Moomina",
    ],
    [],
    [],
  ],
  [
    "Moho Friends",
    [
      "Lax & Nittu",
      "Naveen",
      "Aalim",
      "Adhu",
      "Jai and Zai",
      "Lama and Ishan",
      "Morlee",
      "Hisham Sir",
      "Ashwin",
      "Sofie",
      "Zaym",
      "Mishka",
      "Niyaz and Family",
      "Pirlo and Family",
      "Eeman and Family",
      "Savannah and George",
      "Hashim",
      "Fayya",
      "Shifau",
      "Iffa",
      "Chillo",
      "Laizoo",
      "Ryash",
      "Rifa",
    ],
    [
      "Shard and Zuney",
      "Baasith",
      "Zimaam",
      "Aiham and Rooba",
      "Zuhu and Family",
      "Omar",
      "TimeTech Mohd.",
      "Hamadh",
      "Shaaif",
    ],
    [
      "Amjey - Villigili",
    ],
  ],
  [
    "Shaufa Friends",
    [
      "Nadhu and Najje Plus Liyaa",
      "Rish and Visu",
      "Sulthana",
      "Rugya",
    ],
    [
      "Deeko and Aniko",
      "Deeko Mom",
      "Huma",
      "Huma Mom",
      "Mau and Achu",
      "Seema",
      "Salwa",
      "Mihu",
    ],
    [
      "Shim - Viligili",
    ],
  ],
  [
    "Moho Kaafa Family",
    [
      "Zaha Ahmed",
      "Maree Family",
    ],
    [
      "Kaafa",
      "Fazunaa",
      "Zila Ahmed",
      "Fazunaa", // Duplicate -> 2 portions in Malé
      "Faree",
      "Bouch",
    ],
    [],
  ],
  [
    "Moho Maama Family",
    [
      "Rasheed Dhatha",
      "Imthibe Family",
      "Imthibe Family", // Duplicate -> 2 portions in Hulhumalé
      "Daada Family",
      "Flat Dhatha Family",
      "Miznaatha Family",
      "Dhontha Family",
      "Dhifu Family",
    ],
    [
      "Jawadbe Family",
      "Jawadbe Family", // Duplicate -> 2 portions in Malé
      "Zeenatha Family",
      "Aisthudhatha Family",
    ],
    [],
  ],
];

function makeRecipient(group: string, name: string, area: RecipientArea, key: string, portions: number = 1): Recipient {
  return {
    id: `sheet-${key}`,
    name,
    group,
    area,
    address: "",
    phone: "",
    portions,
    status: "planned",
    notes: "",
    updatedAt: "2026-09-13T00:00:00.000Z",
  };
}

export function mergeDuplicateRecipients(list: Recipient[]): { merged: Recipient[]; duplicateCount: number } {
  const map = new Map<string, Recipient>();
  let duplicateCount = 0;

  for (const item of list) {
    const key = `${item.group.trim().toLowerCase()}:::${item.name.trim().toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      duplicateCount++;
      existing.portions += (item.portions || 1);
      if (!existing.address && item.address) existing.address = item.address;
      if (!existing.phone && item.phone) existing.phone = item.phone;
      if (item.area && existing.area !== item.area) existing.area = item.area;
      if (item.notes && !existing.notes.includes(item.notes)) {
        existing.notes = existing.notes ? `${existing.notes}; ${item.notes}` : item.notes;
      }
      if (item.status === "delivered") existing.status = "delivered";
      else if (item.status === "packed" && existing.status === "planned") existing.status = "packed";
      else if (item.status === "on-hold" && existing.status === "planned") existing.status = "on-hold";
    } else {
      map.set(key, { ...item, portions: item.portions || 1, area: item.area || "Hulhumalé" });
    }
  }

  return { merged: Array.from(map.values()), duplicateCount };
}

const unmergedInitial: Recipient[] = raw.flatMap(([group, hulhumale, male, villimale], groupIndex) => [
  ...hulhumale.map((name, i) => makeRecipient(group, name, "Hulhumalé", `${groupIndex}-hulh-${i}`)),
  ...male.map((name, i) => makeRecipient(group, name, "Malé", `${groupIndex}-male-${i}`)),
  ...villimale.map((name, i) => makeRecipient(group, name, "Villimalé", `${groupIndex}-villi-${i}`)),
]).concat(Array.from({ length: 8 }, (_, i) => ({
  ...makeRecipient("Moho Neighbours", `Neighbour ${i + 1}`, "Hulhumalé", `6-n-${i}`),
  address: "165",
  notes: "Imported from a sheet row labelled 165",
})));

export const INITIAL_RECIPIENTS: Recipient[] = mergeDuplicateRecipients(unmergedInitial).merged;

export const STATUS_META: Record<RecipientStatus, { label: string; tone: string }> = {
  planned: { label: "Planned", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  packed: { label: "Packed", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  "not-picking-up": { label: "Not Picking Up", tone: "bg-orange-50 text-orange-800 border-orange-200" },
  delivered: { label: "Delivered", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  "on-hold": { label: "On hold", tone: "bg-rose-50 text-rose-800 border-rose-200" },
};

export function newRecipient(group: string = GROUPS[0], area: RecipientArea = "Hulhumalé"): Recipient {
  return {
    id: crypto.randomUUID(),
    name: "",
    group,
    area,
    address: "",
    phone: "",
    portions: 1,
    status: "planned",
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}
