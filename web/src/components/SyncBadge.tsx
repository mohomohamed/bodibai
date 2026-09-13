import { AlertTriangle, Check, CloudOff, LoaderCircle } from "lucide-react";
import type { SyncStatus } from "../types";

export function SyncBadge({ status, pending }: { status: SyncStatus; pending: number }) {
  const content = status === "syncing"
    ? { icon: <LoaderCircle size={14} className="spin" />, text: "Syncing" }
    : status === "offline"
      ? { icon: <CloudOff size={14} />, text: pending ? `Offline · ${pending} pending` : "Offline" }
      : status === "issue"
        ? { icon: <AlertTriangle size={14} />, text: pending ? `Sync issue · ${pending}` : "Sync issue" }
        : { icon: <Check size={14} />, text: "Synced" };
  return <span className={`sync-badge ${status}`} title={content.text}>{content.icon}<span>{content.text}</span></span>;
}
