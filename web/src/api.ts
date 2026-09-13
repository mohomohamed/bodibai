const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "https://bondibai-records-api.bondibai-worker.workers.dev" : "http://localhost:8787")
).replace(/\/$/, "");

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export class ApiClientError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiClientError(0, "NETWORK_ERROR", "Unable to connect to server.");
  }
  const body = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.ok) {
    throw new ApiClientError(response.status, body?.error?.code || "REQUEST_FAILED", body?.error?.message || "Request failed.");
  }
  return body.data as T;
}

export async function downloadExport(token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/export.csv`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as ApiEnvelope<never> | null;
    throw new ApiClientError(response.status, body?.error?.code || "EXPORT_FAILED", body?.error?.message || "Export failed.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || "bondibai-records.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
