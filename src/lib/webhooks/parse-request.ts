import type { NextRequest } from "next/server";
import { MAX_WEBHOOK_BODY_BYTES } from "./constants";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "x-api-key",
  "x-hookkit-key",
]);

export type BodyReadResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; error: string };

export function pickHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (!SENSITIVE_HEADERS.has(key.toLowerCase())) {
      result[key] = value;
    }
  });
  return result;
}

export function pickQuery(url: string): Record<string, string> {
  const params = new URL(url).searchParams;
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export async function readWebhookBody(request: NextRequest): Promise<BodyReadResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = Number.parseInt(contentLength, 10);
    if (Number.isFinite(size) && size > MAX_WEBHOOK_BODY_BYTES) {
      return { ok: false, status: 413, error: "payload too large" };
    }
  }

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > MAX_WEBHOOK_BODY_BYTES) {
    return { ok: false, status: 413, error: "payload too large" };
  }

  if (buffer.byteLength === 0) {
    return { ok: true, body: null };
  }

  const contentType = request.headers.get("content-type") ?? "";
  const text = new TextDecoder().decode(buffer);

  if (contentType.includes("application/json")) {
    try {
      return { ok: true, body: JSON.parse(text) };
    } catch {
      return { ok: true, body: { _parseError: "invalid JSON body" } };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(text);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return { ok: true, body: result };
  }

  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: true, body: { _raw: text } };
  }
}

export function inferEventType(body: unknown): string {
  if (!body || typeof body !== "object") return "unknown";
  const obj = body as Record<string, unknown>;
  if (typeof obj.type === "string") return obj.type;
  if (typeof obj.event === "string") return obj.event;
  if (typeof obj.action === "string") return obj.action;
  return "webhook.received";
}
