"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CookingPot, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) { setError(data.error || "Could not sign in."); setLoading(false); return; }
    router.replace("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="glass w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white p-7 shadow-[0_30px_90px_rgba(8,47,73,.14)] sm:p-10">
        <div className="mb-9 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#082f49] text-white"><CookingPot className="size-6" /></span>
          <div><p className="font-display text-2xl font-semibold text-[#082f49]">Bondibai List</p><p className="text-sm text-slate-500">Private household planner</p></div>
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[#082f49]">Welcome back</h1>
        <p className="mt-2 text-base leading-6 text-slate-600">Enter the household password to open your list.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
            <div className="relative">
              <Input id="password" autoFocus autoComplete="current-password" type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-xl bg-white pr-12 text-base" />
              <button type="button" onClick={() => setShow(v => !v)} className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff /> : <Eye />}</button>
            </div>
            {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-700">{error}</p>}
          </div>
          <Button className="h-12 w-full rounded-xl bg-[#087e8b] text-base hover:bg-[#076c77]" disabled={!password || loading}>{loading && <Loader2 className="animate-spin" />}Sign in</Button>
        </form>
        <p className="mt-7 text-center text-xs leading-5 text-slate-500">Your recipient list is securely kept on this device with offline support and CSV backup.</p>
      </section>
    </main>
  );
}
