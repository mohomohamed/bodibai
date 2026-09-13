import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiClientError } from "./api";
import {
  addPending, cacheServerSnapshot, listPending, loadCachedSnapshot, putLocalAddress, putLocalDriver,
  putLocalRecord, removeLocalAddress, removeLocalDriver, removeLocalRecord, removePending, updatePending,
} from "./db";
import type {
  Address, AddressInput, Driver, DriverInput, PendingMutation, RecordInput, RecordItem, SyncStatus,
} from "./types";

interface SyncOptions {
  token: string;
  userName: string;
  onSessionExpired: () => void;
}

function online(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

function localRecord(input: RecordInput, existing?: RecordItem): RecordItem {
  const now = Date.now();
  return {
    ...input,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    updatedBy: existing?.updatedBy || "You · pending",
    version: existing?.version || 1,
    deletedAt: null,
    addresses: existing?.addresses || [],
  };
}

function localAddress(input: AddressInput, existing?: Address): Address {
  const now = Date.now();
  return {
    ...input,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    updatedBy: "You · pending",
    version: existing?.version || 1,
    deletedAt: null,
  };
}

function localDriver(input: DriverInput, existing?: Driver): Driver {
  const now = Date.now();
  return {
    ...input,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    updatedBy: "You · pending",
    version: existing?.version || 1,
    deletedAt: null,
  };
}

async function applyOptimistic(mutation: PendingMutation): Promise<void> {
  const snapshot = await loadCachedSnapshot();
  if (mutation.entityType === "record") {
    if (mutation.method === "DELETE") return removeLocalRecord(mutation.entityId);
    const input = mutation.payload as unknown as RecordInput;
    return putLocalRecord(localRecord(input, snapshot.records.find((item) => item.id === mutation.entityId)));
  }
  if (mutation.entityType === "address") {
    if (mutation.method === "DELETE") return removeLocalAddress(mutation.entityId);
    const input = mutation.payload as unknown as AddressInput;
    const existing = snapshot.records.flatMap((item) => item.addresses).find((item) => item.id === mutation.entityId);
    return putLocalAddress(localAddress(input, existing));
  }
  if (mutation.method === "DELETE") return removeLocalDriver(mutation.entityId);
  const input = mutation.payload as unknown as DriverInput;
  return putLocalDriver(localDriver(input, snapshot.drivers.find((item) => item.id === mutation.entityId)));
}

export function useSync({ token, userName, onSessionExpired }: SyncOptions) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [status, setStatus] = useState<SyncStatus>(online() ? "syncing" : "offline");
  const [syncError, setSyncError] = useState("");
  const syncing = useRef(false);

  const reloadCache = useCallback(async () => {
    const [snapshot, pending] = await Promise.all([loadCachedSnapshot(), listPending()]);
    setRecords(snapshot.records);
    setDrivers(snapshot.drivers);
    setPendingCount(pending.length);
  }, []);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiClientError && error.status === 401) {
           onSessionExpired();
      return;
    }
    setSyncError(error instanceof Error ? error.message : "Sync failed.");
    setStatus(online() ? "issue" : "offline");
  }, [onSessionExpired]);

  const refresh = useCallback(async () => {
    const [serverRecords, serverDrivers] = await Promise.all([
      api<RecordItem[]>("/api/records", {}, token),
      api<Driver[]>("/api/drivers", {}, token),
    ]);
    await cacheServerSnapshot(serverRecords, serverDrivers);
    const pending = await listPending();
    for (const mutation of pending) await applyOptimistic(mutation);
    await reloadCache();
  }, [reloadCache, token]);

  const flush = useCallback(async (): Promise<boolean> => {
    const pending = await listPending();
    for (const mutation of pending) {
      try {
        await api(mutation.path, {
          method: mutation.method,
          body: mutation.payload ? JSON.stringify(mutation.payload) : undefined,
        }, token);
        await removePending(mutation.id);
      } catch (error) {
        if (error instanceof ApiClientError && error.status > 0 && error.status !== 401) {
          await updatePending({ ...mutation, lastError: error.message });
        }
        handleError(error);
        return false;
      }
    }
    return true;
  }, [handleError, token]);

  const syncNow = useCallback(async () => {
    if (syncing.current || !online()) {
      if (!online()) setStatus("offline");
      await reloadCache();
      return;
    }
    syncing.current = true;
    setStatus("syncing");
    setSyncError("");
    try {
      if (await flush()) {
        await refresh();
        setStatus("synced");
      }
    } catch (error) {
      handleError(error);
    } finally {
      syncing.current = false;
    }
  }, [flush, handleError, refresh, reloadCache]);

  useEffect(() => {
    void reloadCache().then(syncNow);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncNow();
    }, 10_000);
    const resume = () => { if (document.visibilityState === "visible") void syncNow(); };
    const offlineEvent = () => { setStatus("offline"); void reloadCache(); };
    window.addEventListener("online", resume);
    window.addEventListener("offline", offlineEvent);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", offlineEvent);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [reloadCache, syncNow]);

  const runMutation = useCallback(async (mutation: PendingMutation) => {
    if (!online()) {
      await addPending(mutation);
      await applyOptimistic(mutation);
      setStatus("offline");
      await reloadCache();
      return;
    }
    setStatus("syncing");
    try {
      await api(mutation.path, {
        method: mutation.method,
        body: mutation.payload ? JSON.stringify(mutation.payload) : undefined,
      }, token);
      await refresh();
      setStatus("synced");
      setSyncError("");
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 0) {
        await addPending(mutation);
        await applyOptimistic(mutation);
        setStatus("offline");
        await reloadCache();
        return;
      }
      handleError(error);
      throw error;
    }
  }, [handleError, refresh, reloadCache, token]);

  const mutation = (type: string, method: PendingMutation["method"], path: string, payload: Record<string, unknown> | undefined,
    entityType: PendingMutation["entityType"], entityId: string): PendingMutation => ({
    id: crypto.randomUUID(), type, method, path, payload, entityType, entityId, createdAt: Date.now(),
  });

  return {
    records, drivers, pendingCount, status, syncError, syncNow,
    saveRecord: (input: RecordInput, editing: boolean) => runMutation(mutation(
      editing ? "UPDATE_RECORD" : "CREATE_RECORD", editing ? "PUT" : "POST",
      editing ? `/api/records/${encodeURIComponent(input.id)}` : "/api/records", input as unknown as Record<string, unknown>, "record", input.id,
    )),
    deleteRecord: (id: string) => runMutation(mutation("DELETE_RECORD", "DELETE", `/api/records/${encodeURIComponent(id)}`, undefined, "record", id)),
    saveAddress: (input: AddressInput, editing: boolean) => runMutation(mutation(
      editing ? "UPDATE_ADDRESS" : "CREATE_ADDRESS", editing ? "PUT" : "POST",
      editing ? `/api/addresses/${encodeURIComponent(input.id)}` : `/api/records/${encodeURIComponent(input.recordId)}/addresses`,
      input as unknown as Record<string, unknown>, "address", input.id,
    )),
    deleteAddress: (id: string) => runMutation(mutation("DELETE_ADDRESS", "DELETE", `/api/addresses/${encodeURIComponent(id)}`, undefined, "address", id)),
    saveDriver: (input: DriverInput, editing: boolean) => runMutation(mutation(
      editing ? "UPDATE_DRIVER" : "CREATE_DRIVER", editing ? "PUT" : "POST",
      editing ? `/api/drivers/${encodeURIComponent(input.id)}` : "/api/drivers", input as unknown as Record<string, unknown>, "driver", input.id,
    )),
    deleteDriver: (id: string) => runMutation(mutation("DELETE_DRIVER", "DELETE", `/api/drivers/${encodeURIComponent(id)}`, undefined, "driver", id)),
    importRows: async (rows: Record<string, unknown>[]) => {
      setStatus("syncing");
      const summary = await api<{ imported: number; updated: number; skipped: number; failed: number; errors: { row: number; message: string }[] }>(
        "/api/import", { method: "POST", body: JSON.stringify({ rows }) }, token,
      );
      await refresh();
      setStatus("synced");
      return summary;
    },
    userName,
  };
}
