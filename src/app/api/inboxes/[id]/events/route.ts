import { requireReadAccess } from "@/lib/auth/require-access";
import { formatRelativeTime } from "@/lib/format-time";
import { listInboxEvents } from "@/lib/store/events";
import {
  DEFAULT_EVENTS_PAGE_SIZE,
  MAX_EVENTS_PAGE_SIZE,
  PUBLIC_ID_PATTERN,
} from "@/lib/webhooks/constants";
import { inferEventType } from "@/lib/webhooks/parse-request";

export const dynamic = "force-dynamic";

function parseLimit(value: string | null): number {
  if (!value) return DEFAULT_EVENTS_PAGE_SIZE;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_EVENTS_PAGE_SIZE;
  return Math.min(n, MAX_EVENTS_PAGE_SIZE);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!PUBLIC_ID_PATTERN.test(id)) {
    return Response.json({ ok: false, error: "invalid inbox id" }, { status: 400 });
  }

  const access = await requireReadAccess(request, id, "inbox");
  if (!access.ok) return access.response;

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const cursor = url.searchParams.get("cursor") ?? undefined;

  const { events: records, nextCursor, hasMore, total } = await listInboxEvents(id, {
    limit,
    cursor,
  });

  const events = records.map((record, index) => ({
    id: index + 1,
    recordId: record.id,
    method: record.method,
    type: inferEventType(record.body),
    time: formatRelativeTime(record.receivedAt),
    status: 200,
    payload:
      record.body && typeof record.body === "object"
        ? (record.body as Record<string, unknown>)
        : { value: record.body },
    receivedAt: record.receivedAt,
  }));

  return Response.json({
    inboxId: id,
    events,
    pagination: {
      limit,
      total,
      hasMore,
      nextCursor,
    },
  });
}
