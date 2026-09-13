import {
  Check,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Truck,
  UploadCloud,
  Users,
} from "lucide-react";
import { useState } from "react";
import { downloadExport } from "../api";
import { type Driver, type DriverInput, type RecordItem, type SyncStatus } from "../types";
import { DriverForm, GroupForm } from "./Forms";
import { ImportPanel } from "./ImportPanel";
import { Modal } from "./Modal";
import { SyncBadge } from "./SyncBadge";

function cleanMaldivesPhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("960")) return digits;
  if (digits.length === 7) return `960${digits}`;
  return digits;
}

export function SettingsPanel({
  token,
  userName,
  appPassword = "",
  drivers,
  groups = [],
  records = [],
  status,
  pendingCount,
  syncError,
  onSync,
  onLogout,
  onSaveDriver,
  onDeleteDriver,
  onSaveGroup,
  onDeleteGroup,
  onSaveAppPassword,
  onPreviewDriver,
  onImport,
  notify,
}: {
  token: string;
  userName: string;
  appPassword?: string;
  drivers: Driver[];
  groups?: string[];
  records?: RecordItem[];
  status: SyncStatus;
  pendingCount: number;
  syncError: string;
  onSync: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSaveDriver: (driver: DriverInput, editing: boolean) => Promise<void>;
  onDeleteDriver: (id: string) => Promise<void>;
  onSaveGroup: (name: string, oldName?: string) => Promise<void>;
  onDeleteGroup: (name: string) => Promise<void>;
  onSaveAppPassword?: (password: string) => Promise<void>;
  onPreviewDriver?: (driver: Driver) => void;
  onImport: (rows: Record<string, unknown>[]) => Promise<any>;
  notify: (message: string) => void;
}) {
  const [editing, setEditing] = useState<Driver | "new" | null>(null);
  const [groupEditing, setGroupEditing] = useState<string | "new" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [passwordEditing, setPasswordEditing] = useState(false);
  const [customPassword, setCustomPassword] = useState(appPassword);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const handleCopyPassword = async () => {
    if (!appPassword) return;
    try {
      await navigator.clipboard.writeText(appPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
      notify("Password copied to clipboard");
    } catch {
      // ignore
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveAppPassword) {
      await onSaveAppPassword(customPassword.trim());
      setPasswordEditing(false);
      notify("App password updated locally");
    }
  };

  const sendWhatsAppCredentials = (driver: Driver) => {
    const password = appPassword || "";
    const message = `Assalaamu Alaikum ${driver.name}! 🛵\n\nHere are your login credentials for *Bondibai App*:\n\n🌐 *App Link:* https://bodibai.vercel.app\n👤 *Username:* ${driver.name}\n🔑 *Password:* ${password || "[Password]"}\n\nOpen the link on your mobile phone to view your assigned delivery route, customer addresses, and Google Maps navigation.\n\n✨ _Bondibai App_`;

    const cleanPhone = cleanMaldivesPhone(driver.phone);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    notify(`Opening WhatsApp credentials for ${driver.name}`);
  };

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

  const removeGroup = async (group: string) => {
    const matchingCount = records.filter((r) => (r.groupName || "").trim() === group).length;
    const msg = matchingCount
      ? `Delete group "${group}"? ${matchingCount} assigned household${matchingCount === 1 ? "" : "s"} will have their group reset.`
      : `Delete group "${group}"?`;
    if (!window.confirm(msg)) return;
    await onDeleteGroup(group);
    notify("Group deleted");
  };

  return (
    <div className="content-narrow">
      <div className="page-heading">
        <div>
          <p className="eyebrow">App controls & Tools</p>
          <h1>Settings</h1>
          <p>Manage fleet, app credentials, data import/export, and Cloudflare synchronization.</p>
        </div>
      </div>

      <section className="settings-grid">
        {/* User Card */}
        <article className="card settings-card">
          <div className="settings-icon"><ShieldCheck /></div>
          <div>
            <h2>Signed in as {userName}</h2>
            <p>Admin privileges active (records, dispatch, settings & fleet management).</p>
            <button className="button secondary" onClick={() => void onLogout()}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </article>

        {/* App Access & Password Card for Admins */}
        <article className="card settings-card password-settings-card">
          <div className="settings-icon"><KeyRound /></div>
          <div>
            <h2>App Access & Password</h2>
            <p className="settings-copy">
              App password used by drivers and admins to sign in.
            </p>
            {passwordEditing ? (
              <form onSubmit={handleSavePassword} className="password-edit-form">
                <input
                  type="text"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Enter app password"
                  autoFocus
                  required
                />
                <div className="inline-form-actions">
                  <button type="submit" className="button primary compact">Save</button>
                  <button type="button" className="button secondary compact" onClick={() => setPasswordEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="password-display-box">
                <div className="password-masked-row">
                  <span className="password-label">Password:</span>
                  <code className="password-value">
                    {showPassword ? (appPassword || "Not set") : "••••••••••••"}
                  </code>
                </div>
                <div className="password-actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {appPassword && (
                    <button
                      type="button"
                      className="icon-button"
                      onClick={handleCopyPassword}
                      title="Copy password"
                      aria-label="Copy password"
                    >
                      {copiedPassword ? <Check size={16} className="copied-icon" /> : <Copy size={16} />}
                    </button>
                  )}
                  {onSaveAppPassword && (
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        setCustomPassword(appPassword);
                        setPasswordEditing(true);
                      }}
                      title="Edit stored password"
                      aria-label="Edit stored password"
                    >
                      <Edit3 size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
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
            <p>Manage fleet drivers, send WhatsApp credentials, and preview driver routes.</p>
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
                {onPreviewDriver && (
                  <button
                    type="button"
                    className="icon-button"
                    title="Preview driver portal"
                    aria-label="Preview driver portal"
                    onClick={() => onPreviewDriver(driver)}
                  >
                    <Eye size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="icon-button"
                  title="Send login username & password via WhatsApp"
                  aria-label="Send login via WhatsApp"
                  onClick={() => sendWhatsAppCredentials(driver)}
                >
                  <KeyRound size={16} />
                </button>
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


      {/* Distribution Groups & Families Management */}
      <section className="card drivers-card">
        <div className="section-title">
          <div>
            <h2>Distribution Groups & Families ({groups.length})</h2>
            <p>Manage family groups and categories for distribution directory filtering.</p>
          </div>
          <button className="button primary compact" onClick={() => setGroupEditing("new")}>
            <Plus size={16} /> Add group
          </button>
        </div>
        <div className="driver-list">
          {groups.map((group) => {
            const matchingRecords = records.filter((r) => (r.groupName || "").trim() === group);
            const totalPortions = matchingRecords.reduce((sum, r) => sum + r.portions, 0);
            return (
              <article key={group}>
                <div className="driver-avatar"><Users /></div>
                <div>
                  <h3>{group}</h3>
                  <p>
                    {matchingRecords.length} household{matchingRecords.length === 1 ? "" : "s"} · {totalPortions} portion{totalPortions === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="inline-actions">
                  <button className="icon-button" aria-label={`Edit ${group}`} onClick={() => setGroupEditing(group)}>
                    <Edit3 size={16} />
                  </button>
                  <button className="icon-button danger" aria-label={`Delete ${group}`} onClick={() => void removeGroup(group)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
          {!groups.length && <p className="subtle-empty">No groups configured yet.</p>}
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

      {/* Group Edit Modal */}
      {groupEditing && (
        <Modal title={groupEditing === "new" ? "Add group" : "Edit group"} onClose={() => setGroupEditing(null)}>
          <GroupForm
            group={groupEditing === "new" ? undefined : groupEditing}
            onCancel={() => setGroupEditing(null)}
            onSave={async (name) => {
              await onSaveGroup(name, groupEditing === "new" ? undefined : groupEditing);
              setGroupEditing(null);
              notify(groupEditing === "new" ? "Group created" : "Group updated");
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

