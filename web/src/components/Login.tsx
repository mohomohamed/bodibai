import { LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";

export function Login({ onLogin }: { onLogin: (name: string, password: string) => Promise<void> }) {
  const [loading, setLoading] = useState(false), [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setLoading(true); setError("");
    try { await onLogin(String(data.get("name") || ""), String(data.get("password") || "")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to sign in."); }
    finally { setLoading(false); }
  };
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark" aria-hidden="true">B</div>
        <div className="login-intro"><p className="eyebrow">Distribution & Delivery</p><h1>Bondibai App</h1><p>Sign in to view delivery routes, Google Maps navigation, and household records.</p></div>
        <form onSubmit={submit} className="form-stack">
          <div className="field"><label htmlFor="login-name">Your name</label><input id="login-name" name="name" autoComplete="name" required autoFocus placeholder="e.g. Mohamed / Shaufa (Admin) or Moho / Driver 1 (Driver)" /></div>
          <div className="field"><label htmlFor="login-password">Password</label><input id="login-password" name="password" type="password" autoComplete="current-password" required /></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary login-button" disabled={loading}><LockKeyhole size={17} />{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="login-footnote">Your session stays private on this device.</p>
      </section>
    </main>
  );
}
