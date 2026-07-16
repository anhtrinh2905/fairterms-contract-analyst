import { auth } from "@/auth";
import type { Prisma } from "@/app/generated/prisma/client";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/auth/admin-audit";
import { isAdminSession } from "@/lib/auth/admin-access";

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

function buildBackendUrl(path: string[]): string {
  const normalized = path.map((segment) => encodeURIComponent(segment)).join("/");
  return `${resolveBackendBaseUrl()}/admin/${normalized}`;
}

async function maybeAuditAdminAction(
  request: Request,
  path: string[],
  method: string,
  upstreamStatus: number,
  session: Session | null,
  bodyBytes: ArrayBuffer | undefined,
): Promise<void> {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return;
  if (upstreamStatus < 200 || upstreamStatus >= 300) return;

  const adminEmail = session?.user?.email;
  if (!adminEmail) return;

  const joined = path.join("/");
  let action: Parameters<typeof writeAdminAuditLog>[0]["action"] | null = null;
  let target = joined;
  let metadata: Prisma.InputJsonValue | undefined;

  if (/^checklists\/[^/]+$/.test(joined)) {
    action = "UPDATE_CHECKLIST";
    target = path[path.length - 1] ?? joined;
  } else if (joined === "rag/ingest") {
    action = "INGEST_RAG_DOCUMENT";
    target = "file upload";
  } else if (joined === "rag/ingest-text") {
    action = "INGEST_RAG_TEXT";
    target = "pasted text";
    if (bodyBytes) {
      try {
        const parsed = JSON.parse(new TextDecoder().decode(bodyBytes)) as { title?: string };
        if (parsed.title) target = parsed.title;
      } catch {
        // ignore parse errors
      }
    }
  } else if (joined === "ai-config") {
    action = "UPDATE_AI_CONFIG";
    target = "ai-config";
    if (bodyBytes) {
      try {
        const parsed = JSON.parse(new TextDecoder().decode(bodyBytes)) as {
          default_model?: string;
          gemini_model?: string;
          gemini_structuring_model?: string;
          embedding_model?: string;
          concurrency_limit?: number;
          openai_api_key?: string;
          gemini_api_key?: string;
        };
        metadata = {
          default_model: parsed.default_model,
          gemini_model: parsed.gemini_model,
          gemini_structuring_model: parsed.gemini_structuring_model,
          embedding_model: parsed.embedding_model,
          concurrency_limit: parsed.concurrency_limit,
          keys_updated: {
            openai: Boolean(parsed.openai_api_key),
            gemini: Boolean(parsed.gemini_api_key),
          },
        };
      } catch {
        // ignore parse errors
      }
    }
  } else if (/^cache\/[^/]+\/flush$/.test(joined)) {
    action = "FLUSH_CACHE";
    target = path[1] ?? joined;
  } else if (/^cache\/[^/]+\/entries\/[^/]+$/.test(joined)) {
    action = "DELETE_CACHE_ENTRY";
    target = `${path[1]}/${path[3]}`;
  }

  if (!action) return;

  await writeAdminAuditLog({
    adminEmail,
    action,
    target,
    metadata,
  });
}

async function proxyToBackend(
  request: Request,
  path: string[],
): Promise<NextResponse> {
  const session = await auth();
  if (!(await isAdminSession(session))) {
    return NextResponse.json({ detail: "Không có quyền truy cập Admin API." }, { status: 403 });
  }

  const token = getAdminApiToken();
  if (!token) {
    return NextResponse.json(
      { detail: "ADMIN_API_TOKEN chưa được cấu hình trên frontend server." },
      { status: 500 },
    );
  }

  const method = request.method.toUpperCase();
  const headers = new Headers();
  headers.set("x-admin-token", token);

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  let bodyBytes: ArrayBuffer | undefined;
  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(method)) {
    bodyBytes = await request.arrayBuffer();
    body = bodyBytes;
  }

  const url = new URL(request.url);
  const backendUrl = `${buildBackendUrl(path)}${url.search}`;
  const upstream = await fetch(backendUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  await maybeAuditAdminAction(request, path, method, upstream.status, session, bodyBytes);

  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    responseHeaders.set("content-type", upstreamContentType);
  }
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyToBackend(request, path || []);
}

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handle(request, context);
}
