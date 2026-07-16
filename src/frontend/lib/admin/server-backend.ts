import { BackendApiError } from "@/lib/api/client";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8010";

function resolveBackendBaseUrl(): string {
  return (
    process.env.BACKEND_URL_INTERNAL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    DEFAULT_BACKEND_URL
  ).replace(/\/$/, "");
}

function getAdminApiToken(): string {
  return (process.env.ADMIN_API_TOKEN || "").trim();
}

export async function fetchAdminBackend<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminApiToken();
  if (!token) {
    throw new BackendApiError("ADMIN_API_TOKEN chưa được cấu hình.", 500);
  }

  const headers = new Headers(init?.headers);
  headers.set("x-admin-token", token);

  const res = await fetch(`${resolveBackendBaseUrl()}/admin${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      // keep statusText
    }
    throw new BackendApiError(detail || `HTTP ${res.status}`, res.status);
  }

  return (await res.json()) as T;
}
