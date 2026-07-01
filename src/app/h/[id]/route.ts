import { debugLog } from "@/lib/debug-log";
import { isInboxPaused } from "@/lib/inboxes/status";
import { checkWebhookRateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request/client-ip";
import { appendWebhookEvent } from "@/lib/store/events";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";
import { inferEventType, pickHeaders, pickQuery, readWebhookBody } from "@/lib/webhooks/parse-request";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_METHODS = new Set(["POST", "PUT", "PATCH"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleWebhook(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleWebhook(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleWebhook(request, await params);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return Response.json({
    ok: true,
    inbox: id,
    methods: ["POST", "PUT", "PATCH"],
    maxBodyBytes: 262144,
    hint: "Send POST with JSON or form body to capture a webhook event.",
    example: `curl -X POST ${base}/h/${id} -H "Content-Type: application/json" -d '{"type":"test"}'`,
  });
}

async function handleWebhook(
  request: NextRequest,
  { id }: { id: string },
) {
  if (!PUBLIC_ID_PATTERN.test(id)) {
    debugLog("h/[id]/route.ts:handleWebhook", "invalid inbox id", { id }, "H3");
    return Response.json({ ok: false, error: "invalid inbox id" }, { status: 400 });
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return Response.json({ ok: false, error: "method not allowed" }, { status: 405 });
  }

  if (await isInboxPaused(id)) {
    return Response.json({ ok: false, error: "inbox paused" }, { status: 503 });
  }

  const clientIp = getClientIp(request);
  const rateLimit = await checkWebhookRateLimit(id, clientIp);
  if (!rateLimit.success) {
    return Response.json(
      { ok: false, error: "rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(rateLimit.reset)) },
      },
    );
  }

  const parsed = await readWebhookBody(request);
  if (!parsed.ok) {
    debugLog(
      "h/[id]/route.ts:handleWebhook",
      "body rejected",
      { id, status: parsed.status, error: parsed.error },
      "H4",
    );
    return Response.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  const record = await appendWebhookEvent({
    inboxId: id,
    method: request.method,
    headers: pickHeaders(request.headers),
    query: pickQuery(request.url),
    body: parsed.body,
  });

  debugLog(
    "h/[id]/route.ts:handleWebhook",
    "webhook stored",
    { id, eventId: record.id, type: inferEventType(parsed.body) },
    "H1",
  );

  return Response.json(
    {
      ok: true,
      eventId: record.id,
      inbox: id,
      type: inferEventType(parsed.body),
      receivedAt: record.receivedAt,
    },
    { status: 200 },
  );
}
