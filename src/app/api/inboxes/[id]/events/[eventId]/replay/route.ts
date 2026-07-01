import { requireReadAccess } from "@/lib/auth/require-access";
import { getInboxSettings } from "@/lib/inboxes/status";
import { getInboxEventById } from "@/lib/store/events";
import { appendReplay } from "@/lib/store/replays";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";
import { replayWebhookEvent } from "@/lib/webhooks/replay";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const { id, eventId } = await params;

  if (!PUBLIC_ID_PATTERN.test(id)) {
    return Response.json({ ok: false, error: "invalid inbox id" }, { status: 400 });
  }

  const access = await requireReadAccess(request, id, "inbox");
  if (!access.ok) return access.response;

  const event = await getInboxEventById(id, eventId);
  if (!event) {
    return Response.json({ ok: false, error: "event not found" }, { status: 404 });
  }

  let body: { url?: string } = {};
  try {
    if (request.headers.get("content-length")) {
      body = (await request.json()) as { url?: string };
    }
  } catch {
    return Response.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const settings = await getInboxSettings(id);
  const targetUrl = body.url?.trim() || settings.replayUrl?.trim() || null;

  if (!targetUrl) {
    return Response.json({ ok: false, error: "replay URL not configured" }, { status: 400 });
  }

  const result = await replayWebhookEvent(event, targetUrl);

  const replay = await appendReplay({
    inboxId: id,
    eventId: event.id,
    targetUrl,
    statusCode: result.statusCode,
    durationMs: result.durationMs,
    error: result.error,
  });

  if (result.error === "unsafe or invalid replay URL") {
    return Response.json(
      {
        ok: false,
        error: result.error,
        replayId: replay.id,
      },
      { status: 400 },
    );
  }

  return Response.json({
    ok: result.ok,
    replayId: replay.id,
    statusCode: result.statusCode,
    durationMs: result.durationMs,
    error: result.error,
    bodyPreview: result.bodyPreview,
  });
}
