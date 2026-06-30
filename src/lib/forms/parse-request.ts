import type { NextRequest } from "next/server";
import { HONEYPOT_FIELD, MAX_WEBHOOK_BODY_BYTES } from "@/lib/webhooks/constants";

export type FormBodyReadResult =
  | { ok: true; fields: Record<string, string> }
  | { ok: false; status: number; error: string };

const REDIRECT_FIELDS = ["_redirect", "redirect_url", "redirect"] as const;

export function isHoneypotTripped(fields: Record<string, string>): boolean {
  const value = fields[HONEYPOT_FIELD];
  return typeof value === "string" && value.trim().length > 0;
}

export function pickRedirectUrl(
  fields: Record<string, string>,
  request: NextRequest,
): string | null {
  for (const key of REDIRECT_FIELDS) {
    const value = fields[key]?.trim();
    if (value) return value;
  }

  const queryRedirect = request.nextUrl.searchParams.get("redirect")?.trim();
  return queryRedirect || null;
}

export function stripInternalFields(fields: Record<string, string>): Record<string, string> {
  const result = { ...fields };
  delete result[HONEYPOT_FIELD];
  for (const key of REDIRECT_FIELDS) {
    delete result[key];
  }
  return result;
}

export function extractEmail(fields: Record<string, string>): string | null {
  for (const key of ["email", "Email", "e-mail", "mail"]) {
    const value = fields[key]?.trim();
    if (value) return value;
  }
  return null;
}

export function extractMessage(fields: Record<string, string>): string | null {
  for (const key of ["message", "Message", "body", "text", "comment", "content"]) {
    const value = fields[key]?.trim();
    if (value) return value;
  }
  return null;
}

export function extractSource(
  fields: Record<string, string>,
  request: NextRequest,
): string | null {
  const fromField = fields.source?.trim() || fields._source?.trim();
  if (fromField) return fromField;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).pathname || referer;
    } catch {
      return referer;
    }
  }

  return null;
}

export function wantsHtmlResponse(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html") && !accept.includes("application/json");
}

export async function readFormFields(request: NextRequest): Promise<FormBodyReadResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = Number.parseInt(contentLength, 10);
    if (Number.isFinite(size) && size > MAX_WEBHOOK_BODY_BYTES) {
      return { ok: false, status: 413, error: "payload too large" };
    }
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    if (!contentLength) {
      return { ok: false, status: 411, error: "content-length required for multipart" };
    }
    const multipartSize = Number.parseInt(contentLength, 10);
    if (!Number.isFinite(multipartSize) || multipartSize > MAX_WEBHOOK_BODY_BYTES) {
      return { ok: false, status: 413, error: "payload too large" };
    }
    const form = await request.formData();
    const fields: Record<string, string> = {};
    form.forEach((value, key) => {
      if (typeof value === "string") fields[key] = value;
    });
    return { ok: true, fields };
  }

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > MAX_WEBHOOK_BODY_BYTES) {
    return { ok: false, status: 413, error: "payload too large" };
  }

  if (buffer.byteLength === 0) {
    return { ok: true, fields: {} };
  }

  const text = new TextDecoder().decode(buffer);

  if (contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, status: 400, error: "invalid JSON body" };
      }
      const fields: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (value === null || value === undefined) continue;
        fields[key] = String(value);
      }
      return { ok: true, fields };
    } catch {
      return { ok: false, status: 400, error: "invalid JSON body" };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(text);
    const fields: Record<string, string> = {};
    params.forEach((value, key) => {
      fields[key] = value;
    });
    return { ok: true, fields };
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const fields: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (value === null || value === undefined) continue;
        fields[key] = String(value);
      }
      return { ok: true, fields };
    }
  } catch {
    // fall through
  }

  return { ok: false, status: 415, error: "unsupported content type" };
}

export function safeRedirectUrl(url: string, request: NextRequest): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Same-origin relative paths only (blocks //evil.com and open redirects)
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (trimmed.includes("\\") || trimmed.includes("://")) return null;
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, request.nextUrl.origin);
    const appOrigin = new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin,
    ).origin;
    if (parsed.origin === appOrigin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return null;
  }

  return null;
}
