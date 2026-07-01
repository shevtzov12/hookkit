import { REPLAY_TIMEOUT_MS } from "@/lib/limits/constants";
import { assertSafeOutboundUrl } from "@/lib/security/ssrf";
import type { WebhookEventRecord } from "@/lib/store/types";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export interface ReplayRequestResult {
  ok: boolean;
  statusCode: number | null;
  durationMs: number;
  error: string | null;
  bodyPreview: string | null;
}

function buildTargetUrl(base: URL, query: Record<string, string>): URL {
  const target = new URL(base.toString());
  for (const [key, value] of Object.entries(query)) {
    target.searchParams.set(key, value);
  }
  return target;
}

function buildReplayBody(body: unknown): BodyInit | undefined {
  if (body === null || body === undefined) return undefined;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

function pickReplayHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      result[key] = value;
    }
  }
  return result;
}

export async function replayWebhookEvent(
  event: WebhookEventRecord,
  targetUrl: string,
): Promise<ReplayRequestResult> {
  const safeUrl = await assertSafeOutboundUrl(targetUrl);
  if (!safeUrl) {
    return {
      ok: false,
      statusCode: null,
      durationMs: 0,
      error: "unsafe or invalid replay URL",
      bodyPreview: null,
    };
  }

  const url = buildTargetUrl(safeUrl, event.query);
  const headers = pickReplayHeaders(event.headers);
  const hasJsonBody =
    event.body !== null &&
    event.body !== undefined &&
    typeof event.body === "object" &&
    !headers["content-type"] &&
    !headers["Content-Type"];

  if (hasJsonBody) {
    headers["Content-Type"] = "application/json";
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REPLAY_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: event.method,
      headers,
      body: buildReplayBody(event.body),
      signal: controller.signal,
      redirect: "manual",
    });

    const durationMs = Date.now() - started;
    const text = await response.text();
    const bodyPreview = text.slice(0, 512);

    return {
      ok: response.ok,
      statusCode: response.status,
      durationMs,
      error: null,
      bodyPreview: bodyPreview || null,
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : "replay failed",
      bodyPreview: null,
    };
  } finally {
    clearTimeout(timer);
  }
}
