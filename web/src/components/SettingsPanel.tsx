import { Download, Edit3, LogOut, Plus, RefreshCw, ShieldCheck, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { downloadExport } from "../api";
import type { Driver, DriverInput, SyncStatus } from "../types";
import { DriverForm } from "./Forms";
import { Modal } from "./Modal";
import { SyncBadge } from "./SyncBadge";

export function SettingsPanel({ token, userName, drivers, status, pendingCount, syncError, onSync, onLogout, onSaveDriver, onDeleteDriver, notify }: {
  token: string; userName: string; drivers: Driver[]; status: SyncStatus; pendingCount: number; syncError: string;
  onSync: () => Promise<void>; onLogout: () => Promise<void>; onSaveDriver: (driver: DriverInput, editing: boolean) => Promise<void>;
  onDeleteDriver: (id: string) => Promise<void>; notify: (message: string) => void;
}) {
  const [editing, setEditing] = useState<Driver | "new" | null>(null), [exporting, setExporting] = useState(false), [error, setError] = useState("");
  const exportData = async () => { setExporting(true); setError(""); try { await downloadExport(token); notify("CSV export downloaded"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Export failed."); } finally { setExporting(false); } };
  const remove = async (driver: Driver) => { if (!window.confirm(`Delete driver ${driver.name}? Existing records will become unassigned.`)) return; await onDeleteDriver(driver.id); notify("Driver deleted"); };
  return <div className="content-narrow">
    <div className="page-heading"><div><p className="eyebrow">App controls</p><h1>Settings</h1><p>Manage drivers, data, sync, and your session.</p></div></div>
    <section className="settings-grid">
      <article className="card settings-card"><div className="settings-icon"><ShieldCheck /></div><div><h2>Signed in as {userName}</h2><p>Your session token is stored only in this browser and can be revoked at any time.</p><button className="button secondary" onClick={() => void onLogout()}><LogOut size={16} />Sign out</button></div></article>
      <article className="card settings-card"><div className="settings-icon"><RefreshCw /></div><div><h2>Synchronization</h2><p><SyncBadge status={status} pending={pendingCount} /></p><p className="settings-copy">D1 is the master copy. Visible tabs refresh every 10 seconds.</p>{syncError && <p className="form-error">{syncError}</p>}<button className="button secondary" onClick={() => void onSync()}><RefreshCw size={16} />Sync now{pendingCount ? ` · ${pendingCount} pending` : ""}</button></div></article>
      <article className="card settings-card"><div className="settings-icon"><Download /></div><div><h2>Export data</h2><p>Download all active records and addresses as an Excel-friendly CSV.</p><button className="button secondary" disabled={exporting} onClick={() => void exportData()}><Download size={16} />{exporting ? "Preparing…" : "Download CSV"}</button>{error && <p className="form-error">{error}</p>}</div></article>
    </section>
    <section className="card drivers-card"><div className="section-title"><div><h2>Drivers</h2><p>Assign delivery helpers to records.</p></div><button className="button primary compact" onClick={() => setEditing("new")}><Plus size={16} />Add driver</button></div>
      <div className="driver-list">{drivers.map((driver) => <article key={driver.id}><div className="driver-avatar"><Truck /></div><div><h3>{driver.name}{!driver.active && <span className="inactive-label">Inactive</span>}</h3><p>{[driver.phone, driver.vehicle, driver.area].filter(Boolean).join(" · ") || "No additional details"}</p></div><div className="inline-actions"><button className="icon-button" aria-label="Edit driver" onClick={() => setEditing(driver)}><Edit3 size={16} /></button><button className="icon-button danger" aria-label="Delete driver" onClick={() => void remove(driver)}><Trash2 size={16} /></button></div></article>)}{!drivers.length && <p className="subtle-empty">No drivers added yet.</p>}</div>
    </section>
    {editing && <Modal title={editing === "new" ? "Add driver" : "Edit driver"} onClose={() => setEditing(null)}><DriverForm driver={editing === "new" ? undefined : editing} onCancel={() => setEditing(null)} onSave={async (value) => { await onSaveDriver(value, editing !== "new"); setEditing(null); notify(editing === "new" ? "Driver added" : "Driver updated"); }} /></Modal>}
  </div>;
}
