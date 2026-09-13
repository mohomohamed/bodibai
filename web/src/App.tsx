import { FileUp, List, LogOut, Menu, Settings, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, ApiClientError } from "./api";
import { getSetting, removeSetting, saveSetting } from "./db";
import { ImportPanel } from "./components/ImportPanel";
import { Login } from "./components/Login";
import { RecordsPanel } from "./components/RecordsPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { SyncBadge } from "./components/SyncBadge";
import { useSync } from "./useSync";

interface SessionState { token: string; userName: string }
type Page = "records" | "import" | "settings";

function LoadingScreen() {
  return <div className="loading-screen"><img src="/favicon.svg" alt="" /><p>Opening Bondibai…</p></div>;
}

function AuthenticatedApp({ session, endSession }: { session: SessionState; endSession: (remote: boolean) => Promise<void> }) {
  const [page, setPage] = useState<Page>("records"), [menuOpen, setMenuOpen] = useState(false), [toast, setToast] = useState("");
  const expired = useCallback(() => { void endSession(false); }, [endSession]);
  const sync = useSync({ token: session.token, userName: session.userName, onSessionExpired: expired });
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2800); };
  const navigate = (next: Page) => { setPage(next); setMenuOpen(false); };

  return <div className="app-shell">
    <header className="topbar">
      <button className="menu-button icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">{menuOpen ? <X /> : <Menu />}</button>
      <button className="brand" onClick={() => navigate("records")}><img src="/favicon.svg" alt="" /><span>Bondibai <small>List</small></span></button>
      <button className="top-sync" onClick={() => void sync.syncNow()} aria-label="Synchronize"><SyncBadge status={sync.status} pending={sync.pendingCount} /></button>
      <button className="user-menu" onClick={() => navigate("settings")}><span className="user-avatar">{session.userName.slice(0, 1).toUpperCase()}</span><span>{session.userName}</span></button>
    </header>
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
      <nav aria-label="Primary navigation">
        <button className={page === "records" ? "active" : ""} onClick={() => navigate("records")}><List />Records</button>
        <button className={page === "import" ? "active" : ""} onClick={() => navigate("import")}><FileUp />Import</button>
        <button className={page === "settings" ? "active" : ""} onClick={() => navigate("settings")}><Settings />Settings</button>
      </nav>
      <div className="sidebar-foot"><div className="privacy-note"><UserRound /><span><strong>Private workspace</strong><small>D1 master database</small></span></div><button onClick={() => void endSession(true)}><LogOut />Sign out</button></div>
    </aside>
    {menuOpen && <button className="menu-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <main className="main-content">
      {sync.status === "offline" && <div className="offline-banner">You’re offline. Changes stay on this device and will sync automatically.{sync.pendingCount ? ` ${sync.pendingCount} waiting.` : ""}</div>}
      {sync.status === "issue" && <div className="offline-banner issue">Sync needs attention: {sync.syncError || "a pending change could not be sent."}</div>}
      {page === "records" && <RecordsPanel records={sync.records} drivers={sync.drivers} saveRecord={sync.saveRecord} deleteRecord={sync.deleteRecord} saveAddress={sync.saveAddress} deleteAddress={sync.deleteAddress} notify={notify} />}
      {page === "import" && <ImportPanel onImport={sync.importRows} />}
      {page === "settings" && <SettingsPanel token={session.token} userName={session.userName} drivers={sync.drivers} status={sync.status} pendingCount={sync.pendingCount} syncError={sync.syncError} onSync={sync.syncNow} onLogout={() => endSession(true)} onSaveDriver={sync.saveDriver} onDeleteDriver={sync.deleteDriver} notify={notify} />}
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <button className={page === "records" ? "active" : ""} onClick={() => navigate("records")}><List />Records</button>
      <button className={page === "import" ? "active" : ""} onClick={() => navigate("import")}><FileUp />Import</button>
      <button className={page === "settings" ? "active" : ""} onClick={() => navigate("settings")}><Settings />More</button>
    </nav>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

export default function App() {
  const [session, setSession] = useState<SessionState | null>(null), [loading, setLoading] = useState(true);
  useEffect(() => {
    void (async () => {
      const [token, userName] = await Promise.all([getSetting<string>("authToken"), getSetting<string>("userName")]);
      if (!token || !userName) { setLoading(false); return; }
      if (!navigator.onLine) { setSession({ token, userName }); setLoading(false); return; }
      try {
        const me = await api<{ user: { name: string } }>("/api/auth/me", {}, token);
        setSession({ token, userName: me.user.name });
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 0) setSession({ token, userName });
        else { await Promise.all([removeSetting("authToken"), removeSetting("userName")]); }
      } finally { setLoading(false); }
    })();
  }, []);

  const signIn = async (name: string, password: string) => {
    const result = await api<{ token: string; user: { name: string } }>("/api/auth/login", { method: "POST", body: JSON.stringify({ name, password }) });
    await Promise.all([saveSetting("authToken", result.token), saveSetting("userName", result.user.name)]);
    setSession({ token: result.token, userName: result.user.name });
  };
  const endSession = useCallback(async (remote: boolean) => {
    const current = session;
    if (remote && current && navigator.onLine) await api("/api/auth/logout", { method: "POST" }, current.token).catch(() => undefined);
    await Promise.all([removeSetting("authToken"), removeSetting("userName")]);
    setSession(null);
  }, [session]);

  if (loading) return <LoadingScreen />;
  if (!session) return <Login onLogin={signIn} />;
  return <AuthenticatedApp session={session} endSession={endSession} />;
}
