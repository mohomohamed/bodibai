import { Compass, Download, Edit3, FileSpreadsheet, LogOut, Plus, RefreshCw, ShieldCheck, Trash2, Truck, UploadCloud } from "lucide-react";
import { useState } from "react";
import { downloadExport } from "../api";
import { getPreferredMap, MAP_PROVIDERS, setPreferredMap, type Driver, type DriverInput, type MapProvider, type SyncStatus } from "../types";
import { DriverForm } from "./Forms";
import { ImportPanel } from "./ImportPanel";
import { Modal } from "./Modal";
import { SyncBadge } from "./SyncBadge";

export function SettingsPanel({
  token,
  userName,
  drivers,
  status,
  pendingCount,
  syncError,
  onSync,
  onLogout,
  onSaveDriver,
  onDeleteDriver,
  onImport,
  notify,
}: {
  token: string;
  userName: string;
  drivers: Driver[];
  status: SyncStatus;
  pendingCount: number;
  syncError: string;
  onSync: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSaveDriver: (driver: DriverInput, editing: boolean) => Promise<void>;
  onDeleteDriver: (id: string) => Promise<void>;
  onImport: (rows: Record<string, unknown>[]) => Promise<any>;
  notify: (message: string) => void;
}) {
  const [editing, setEditing] = useState<Driver | "new" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const exportData = async () => {
    setExporting(true);
    setError("");
    try {
      await downloadExport(token);
      notify("CSV export downloaded");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const remove = async (driver: Driver) => {
    if (!window.confirm(`Delete driver ${driver.name}? Existing records will become unassigned.`)) return;
    await onDeleteDriver(driver.id);
    notify("Driver deleted");
  };

  return (
    <div className="content-narrow">
      <div className="page-heading">
        <div>
          <p className="eyebrow">App controls & Tools</p>
          <h1>Settings</h1>
          <p>Manage fleet, data import/export, maps, and Cloudflare synchronization.</p>
        </div>
      </div>

      <section className="settings-grid">
        {/* User Card */}
        <article className="card settings-card">
          <div className="settings-icon"><ShieldCheck /></div>
          <div>
            <h2>Signed in as {userName}</h2>
            <p>Your session token is stored securely in this browser and can be revoked at any time.</p>
            <button className="button secondary" onClick={() => void onLogout()}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </article>

        {/* Map Preference */}
        <article className="card settings-card">
          <div className="settings-icon"><Compass /></div>
          <div>
            <h2>Default Map App</h2>
            <p className="settings-copy">Choose which map opens when searching addresses or launching navigation.</p>
            <div className="field map-setting-field">
              <select
                value={getPreferredMap()}
                onChange={(e) => {
                  setPreferredMap(e.target.value as any);
                  notify(`Default map set to ${MAP_PROVIDERS[e.target.value as keyof typeof MAP_PROVIDERS]?.label}`);
                }}
              >
                {Object.values(MAP_PROVIDERS).map((p) => (
                  <option key={p.id} value={p.id}>{p.badge} — {p.desc}</option>
                ))}
              </select>
            </div>
          </div>
        </article>

        {/* CSV Import Tool */}
        <article className="card settings-card">
          <div className="settings-icon"><UploadCloud /></div>
          <div>
            <h2>Import Data</h2>
            <p className="settings-copy">Upload a CSV file of household recipients, addresses, and portions.</p>
            <button className="button primary" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet size={16} /> Open CSV Importer
            </button>
          </div>
        </article>

        {/* CSV Export Tool */}
        <article className="card settings-card">
          <div className="settings-icon"><Download /></div>
          <div>
            <h2>Export Data</h2>
            <p>Download all active records, portions, and addresses as an Excel-friendly CSV.</p>
            <button className="button secondary" disabled={exporting} onClick={() => void exportData()}>
              <Download size={16} /> {exporting ? "Preparing…" : "Download CSV"}
            </button>
            {error && <p className="form-error">{error}</p>}
          </div>
        </article>

        {/* Sync Status */}
        <article className="card settings-card">
          <div className="settings-icon"><RefreshCw /></div>
          <div>
            <h2>Synchronization</h2>
            <p><SyncBadge status={status} pending={pendingCount} /></p>
            <p className="settings-copy">Cloudflare D1 is the master copy. Visible tabs sync live automatically.</p>
            {syncError && <p className="form-error">{syncError}</p>}
            <button className="button secondary" onClick={() => void onSync()}>
              <RefreshCw size={16} /> Sync now{pendingCount ? ` · ${pendingCount} pending` : ""}
            </button>
          </div>
        </article>
      </section>

      {/* Fleet Management */}
      <section className="card drivers-card">
        <div className="section-title">
          <div>
            <h2>Fleet Drivers ({drivers.length})</h2>
            <p>Manage available drivers for assignment and WhatsApp routing.</p>
          </div>
          <button className="button primary compact" onClick={() => setEditing("new")}>
            <Plus size={16} /> Add driver
          </button>
        </div>
        <div className="driver-list">
          {drivers.map((driver) => (
            <article key={driver.id}>
              <div className="driver-avatar"><Truck /></div>
              <div>
                <h3>
                  {driver.name} {!driver.active && <span className="inactive-label">Inactive</span>}
                </h3>
                <p>
                  {[driver.phone, driver.vehicle, driver.area].filter(Boolean).join(" · ") || "No details entered"}
                </p>
              </div>
              <div className="inline-actions">
                <button className="icon-button" aria-label="Edit driver" onClick={() => setEditing(driver)}>
                  <Edit3 size={16} />
                </button>
                <button className="icon-button danger" aria-label="Delete driver" onClick={() => void remove(driver)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          {!drivers.length && <p className="subtle-empty">No drivers added yet.</p>}
        </div>
      </section>

      {/* Driver Edit Modal */}
      {editing && (
        <Modal title={editing === "new" ? "Add driver" : "Edit driver"} onClose={() => setEditing(null)}>
          <DriverForm
            driver={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSave={async (value) => {
              await onSaveDriver(value, editing !== "new");
              setEditing(null);
              notify(editing === "new" ? "Driver added" : "Driver updated");
            }}
          />
        </Modal>
      )}

      {/* CSV Import Modal */}
      {importOpen && (
        <Modal title="Import CSV Records" onClose={() => setImportOpen(false)} wide>
          <ImportPanel onImport={async (rows) => {
            const summary = await onImport(rows);
            notify(`Imported ${summary.imported} records successfully`);
            return summary;
          }} />
        </Modal>
      )}
    </div>
  );
}

