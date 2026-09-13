<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Bondibai List PWA — AI Agent Handover Guide

> **For incoming AI Agents**: Read this guide first whenever starting or resuming a session on this repository.

---

## 1. Project Overview & Dual Architecture

This repository contains two architectures developed for the **Bondibai Distribution & Logistics PWA** for Maldivian island delivery:

### Mode A: Next.js Standalone PWA (Primary / Active App)
- **Root Directory**: `app/`, `components/bondibai-app.tsx`, `lib/bondibai-data.ts`, `public/sw.js`
- **Stack**: Next.js 16 (Turbopack), React 19, Tailwind CSS, Lucide icons, Sonner toast, Radix UI dialogs.
- **Port**: `3002` (or `3000`)
- **Persistence**: `localStorage` keys:
  - `bondibai-recipients-v2`: Recipient households & portions
  - `bondibai-drivers-v1`: Driver fleet (vehicles, phones, zones, status)
  - `bondibai-preferred-map`: Default map app (`eatolls` | `google` | `apple` | `waze`)
- **Key Features**:
  1. **Eatolls Maldives Map & Multimap Modal**: In-app modal with Eatolls query link, Google Map embed, Apple Maps, and Waze driving directions.
  2. **Maldivian Address Presets**: Quick prefixes for `H.` (Henveiru), `M.` (Machangoalhi), `G.` (Galolhu), `Ma.` (Maafannu), `Hiyaa Flat H`, `Vinares Flat V`, `Villimalé`.
  3. **Island & Sub-Zone Filters**: Instant filtering across `All Areas`, `Malé` (Red tag), `Hulhumalé` (Blank tag), and `Villimalé` (Green tag) plus sub-zones.
  4. **Duplicate Portion Merge**: Detects duplicate family entries and aggregates total Bondibai portions.
  5. **Driver Fleet & Dispatch Panel (Full CRUD)**:
     - Driver models with Vehicle Types (`Motorcycle 🛵`, `Car 🚗`, `Van 🚐`, `Pickup 🛻`, `Bicycle 🚲`, `Other 📦`).
     - Real-time delivery progress bars, portion counts, and pending/delivered metrics.
     - **WhatsApp Route Dispatch**: Formatted stop list sent straight to driver's WhatsApp (`wa.me/960...`).
     - **Cascading Name Updates**: Renaming a driver automatically updates all assigned households in state and storage.
     - **Safe Deletion**: Deleting a driver safely resets their assigned households to `Unassigned`.

### Mode B: Cloudflare Worker + Vite PWA Monorepo (`web/` + `worker/`)
- **`worker/`**: Cloudflare Workers API with D1 SQLite database (`env.DB`), Bearer token authentication, CRUD endpoints (`/api/records`, `/api/drivers`, `/api/addresses`, `/api/import`, `/api/export.csv`).
- **`web/`**: Vite + React PWA with offline IndexedDB mutation queue (`idb`), offline banner, and sync indicator.
- **Ports**: API on `8787`, Web on `5174` (or `5173`).

---

## 2. Quick Command Reference

```bash
# === Next.js App ===
npm run dev                  # Start dev server (or npx next dev --port 3002)
npm run build                # Next.js production build check

# === Cloudflare Worker + Vite Monorepo ===
npm run dev --workspace worker    # Start Wrangler dev worker on port 8787
npm run dev --workspace web       # Start Vite frontend on port 5174
npm run typecheck                 # Strict TypeScript check across all workspaces
npm test                          # Run Vitest unit test suites
node worker/test/integration.mjs  # Run API integration suite
npm run test:e2e                  # Run Playwright E2E test suite
```

---

## 3. Data Models & Schemas

### Recipient (`lib/bondibai-data.ts`)
```typescript
export type RecipientArea = "Malé" | "Hulhumalé" | "Villimalé";
export type RecipientStatus = "planned" | "packed" | "delivered" | "on-hold";

export interface Recipient {
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
}
```

### Driver (`lib/bondibai-data.ts`)
```typescript
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
```

---

## 4. Agent Handover Checklist (When Resuming)

When you take over a session or start a new prompt:
1. **Check Active Ports**: Run `lsof -nP -iTCP:3002,5174,8787 -sTCP:LISTEN` to see what servers are running.
2. **Verify Typecheck & Build**: Run `npm run typecheck` or `npm run build` to confirm 0 compilation errors.
3. **Inspect Active Component**: The main UI component is [components/bondibai-app.tsx](file:///Users/mohamedmoho/Desktop/Bondibai-List-PWA-Vercel/components/bondibai-app.tsx).
4. **Preserve Maldivian Logistics Logic**:
   - Eatolls map query format: `https://eatolls.com/search?q=${encodeURIComponent(query)}`
   - Maldivian phone prefix: `+960` or `960` (mobile numbers are 7-digit starting with 7 or 9).
   - Island area coloring: Malé (Rose/Red), Hulhumalé (Cyan/Blank), Villimalé (Emerald/Green).
5. **No Regressions**: When editing `components/bondibai-app.tsx`, ensure all dialogs (`MapModal`, `QuickAddressDialog`, `RecipientDialog`, `DriverManagementDialog`, `DriverFormDialog`, `DriverDeleteDialog`) remain wired and error-free.
