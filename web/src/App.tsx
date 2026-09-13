import { List, LogOut, Menu, Settings, Truck, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiClientError } from "./api";
import { getSetting, removeSetting, saveSetting } from "./db";
import { DispatchPanel } from "./components/DispatchPanel";
import { DriverPortal } from "./components/DriverPortal";
import { Login } from "./components/Login";
import { RecordsPanel } from "./components/RecordsPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { SyncBadge } from "./components/SyncBadge";
import { DEFAULT_GROUPS, type Driver, isAdminUser } from "./types";
import { useSync } from "./useSync";

interface SessionState {
  token: string;
  userName: string;
  appPassword?: string;
}

type Page = "records" | "dispatch" | "settings";

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <img src="/favicon.svg" alt="" />
      <p>Opening Bondibai App…</p>
    </div>
  );
}

function AuthenticatedApp({
  session,
  appPassword,
  onSaveAppPassword,
  endSession,
}: {
  session: SessionState;
  appPassword?: string;
  onSaveAppPassword: (pwd: string) => Promise<void>;
  endSession: (remote: boolean) => Promise<void>;
}) {
  const [page, setPage] = useState<Page>("records");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [groups, setGroups] = useState<string[]>([...DEFAULT_GROUPS]);
  const [previewDriver, setPreviewDriver] = useState<Driver | null>(null);

  const isAdmin = isAdminUser(session.userName);
  const expired = useCallback(() => { void endSession(false); }, [endSession]);
  const sync = useSync({ token: session.token, userName: session.userName, onSessionExpired: expired });
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2800); };
  const navigate = (next: Page) => { setPage(next); setMenuOpen(false); };

  // Match or generate a driver object for the logged-in driver
  const currentDriver = useMemo<Driver>(() => {
    const match = sync.drivers.find(
      (d) =>
        d.name.trim().toLowerCase() === session.userName.trim().toLowerCase() ||
        d.id.trim().toLowerCase() === session.userName.trim().toLowerCase(),
    );
    if (match) return match;
    return {
      id: session.userName,
      name: session.userName,
      phone: "",
      vehicle: "Motorcycle",
      area: "All Areas",
      notes: "",
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: session.userName,
      version: 1,
      deletedAt: null,
    };
  }, [sync.drivers, session.userName]);

  // Load custom groups from storage, or seed from DEFAULT_GROUPS + existing record groups
  useEffect(() => {
    void (async () => {
      const stored = await getSetting<string[]>("groups");
      if (stored && Array.isArray(stored) && stored.length > 0) {
        setGroups(stored);
      } else {
        const set = new Set<string>(DEFAULT_GROUPS);
        sync.records.forEach((r) => {
          const g = (r.groupName || "").trim();
          if (g) set.add(g);
        });
        const initial = Array.from(set).sort((a, b) => a.localeCompare(b));
        setGroups(initial);
        await saveSetting("groups", initial);
      }
    })();
  }, [sync.records.length]);

  const saveGroup = async (name: string, oldName?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    let next: string[];
    if (oldName) {
      next = groups.map((g) => (g === oldName ? trimmed : g));
      // Cascade rename to matching records
      const matching = sync.records.filter((r) => (r.groupName || "").trim() === oldName);
      for (const record of matching) {
        await sync.saveRecord({ ...record, groupName: trimmed }, true);
      }
    } else {
      if (groups.includes(trimmed)) return;
      next = [...groups, trimmed].sort((a, b) => a.localeCompare(b));
    }
    setGroups(next);
    await saveSetting("groups", next);
  };

  const deleteGroup = async (name: string) => {
    const next = groups.filter((g) => g !== name);
    setGroups(next);
    await saveSetting("groups", next);
    // Cascade reset to matching records
    const matching = sync.records.filter((r) => (r.groupName || "").trim() === name);
    for (const record of matching) {
      await sync.saveRecord({ ...record, groupName: "" }, true);
    }
  };

  // If user is a Driver (any user other than Mohamed or Shaufa), render dedicated Driver Portal directly
  if (!isAdmin) {
    return (
      <div className="driver-app-shell">
        <DriverPortal
          driver={currentDriver}
          records={sync.records}
          allDrivers={sync.drivers}
          status={sync.status}
          pendingCount={sync.pendingCount}
          syncError={sync.syncError}
          onSync={sync.syncNow}
          onLogout={() => endSession(true)}
          saveRecord={sync.saveRecord}
          notify={notify}
        />
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    );
  }

  // If Admin is previewing a Driver's Portal
  if (previewDriver) {
    return (
      <div className="driver-app-shell">
        <DriverPortal
          driver={previewDriver}
          records={sync.records}
          allDrivers={sync.drivers}
          status={sync.status}
          pendingCount={sync.pendingCount}
          syncError={sync.syncError}
          isAdminPreview
          onExitPreview={() => setPreviewDriver(null)}
          onSync={sync.syncNow}
          onLogout={() => endSession(true)}
          saveRecord={sync.saveRecord}
          notify={notify}
        />
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    );
  }

  // Full Admin Portal Shell (Mohamed & Shaufa)
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="menu-button icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">
          {menuOpen ? <X /> : <Menu />}
        </button>
        <button className="brand" onClick={() => navigate("records")}>
          <img src="/favicon.svg" alt="" />
          <span>Bondibai <small>App</small></span>
        </button>
        <button className="top-sync" onClick={() => void sync.syncNow()} aria-label="Synchronize">
          <SyncBadge status={sync.status} pending={sync.pendingCount} />
        </button>
        <button className="user-menu" onClick={() => navigate("settings")}>
          <span className="user-avatar">{session.userName.slice(0, 1).toUpperCase()}</span>
          <span>{session.userName}</span>
        </button>
      </header>
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <nav aria-label="Primary navigation">
          <button className={page === "records" ? "active" : ""} onClick={() => navigate("records")}>
            <List />Records
          </button>
          <button className={page === "dispatch" ? "active" : ""} onClick={() => navigate("dispatch")}>
            <Truck />Dispatch
          </button>
          <button className={page === "settings" ? "active" : ""} onClick={() => navigate("settings")}>
            <Settings />Settings
          </button>
        </nav>
        <div className="sidebar-foot">
          <div className="privacy-note">
            <UserRound />
            <span><strong>Admin workspace</strong><small>D1 master database</small></span>
          </div>
          <button onClick={() => void endSession(true)}>
            <LogOut />Sign out
          </button>
        </div>
      </aside>
      {menuOpen && <button className="menu-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <main className="main-content">
        {sync.status === "offline" && (
          <div className="offline-banner">
            You’re offline. Changes stay on this device and will sync automatically.{sync.pendingCount ? ` ${sync.pendingCount} waiting.` : ""}
          </div>
        )}
        {sync.status === "issue" && (
          <div className="offline-banner issue">
            Sync needs attention: {sync.syncError || "a pending change could not be sent."}
          </div>
        )}
        {page === "records" && (
          <RecordsPanel
            records={sync.records}
            drivers={sync.drivers}
            groups={groups}
            isAdmin={isAdminUser(session.userName)}
            saveRecord={sync.saveRecord}
            deleteRecord={sync.deleteRecord}
            saveAddress={sync.saveAddress}
            deleteAddress={sync.deleteAddress}
            notify={notify}
          />
        )}
        {page === "dispatch" && (
          <DispatchPanel
            records={sync.records}
            drivers={sync.drivers}
            appPassword={appPassword}
            saveRecord={sync.saveRecord}
            saveDriver={sync.saveDriver}
            deleteDriver={sync.deleteDriver}
            onPreviewDriver={(d) => setPreviewDriver(d)}
            notify={notify}
          />
        )}
        {page === "settings" && (
          <SettingsPanel
            token={session.token}
            userName={session.userName}
            appPassword={appPassword}
            drivers={sync.drivers}
            groups={groups}
            records={sync.records}
            status={sync.status}
            pendingCount={sync.pendingCount}
            syncError={sync.syncError}
            onSync={sync.syncNow}
            onLogout={() => endSession(true)}
            onSaveDriver={sync.saveDriver}
            onDeleteDriver={sync.deleteDriver}
            onSaveGroup={saveGroup}
            onDeleteGroup={deleteGroup}
            onSaveAppPassword={onSaveAppPassword}
            onPreviewDriver={(d) => setPreviewDriver(d)}
            onImport={sync.importRows}
            notify={notify}
          />
        )}
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className={page === "records" ? "active" : ""} onClick={() => navigate("records")}>
          <List />Records
        </button>
        <button className={page === "dispatch" ? "active" : ""} onClick={() => navigate("dispatch")}>
          <Truck />Dispatch
        </button>
        <button className={page === "settings" ? "active" : ""} onClick={() => navigate("settings")}>
          <Settings />Settings
        </button>
      </nav>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [appPassword, setAppPassword] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [token, userName, storedPassword] = await Promise.all([
        getSetting<string>("authToken"),
        getSetting<string>("userName"),
        getSetting<string>("appPassword"),
      ]);
      if (storedPassword) setAppPassword(storedPassword);
      if (!token || !userName) { setLoading(false); return; }
      if (!navigator.onLine) { setSession({ token, userName, appPassword: storedPassword }); setLoading(false); return; }
      try {
        const me = await api<{ user: { name: string } }>("/api/auth/me", {}, token);
        setSession({ token, userName: me.user.name, appPassword: storedPassword });
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 0) {
          setSession({ token, userName, appPassword: storedPassword });
        } else {
          await Promise.all([removeSetting("authToken"), removeSetting("userName")]);
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const signIn = async (name: string, password: string) => {
    const result = await api<{ token: string; user: { name: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ name, password }) },
    );
    await Promise.all([
      saveSetting("authToken", result.token),
      saveSetting("userName", result.user.name),
      saveSetting("appPassword", password),
    ]);
    setAppPassword(password);
    setSession({ token: result.token, userName: result.user.name, appPassword: password });
  };

  const handleSaveAppPassword = async (password: string) => {
    await saveSetting("appPassword", password);
    setAppPassword(password);
  };

  const endSession = useCallback(async (remote: boolean) => {
    const current = session;
    if (remote && current && navigator.onLine) await api("/api/auth/logout", { method: "POST" }, current.token).catch(() => undefined);
    await Promise.all([removeSetting("authToken"), removeSetting("userName")]);
    setSession(null);
  }, [session]);

  if (loading) return <LoadingScreen />;
  if (!session) return <Login onLogin={signIn} />;
  return (
    <AuthenticatedApp
      session={session}
      appPassword={appPassword}
      onSaveAppPassword={handleSaveAppPassword}
      endSession={endSession}
    />
  );
}
