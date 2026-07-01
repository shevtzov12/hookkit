import { requireReadAccess } from "@/lib/auth/require-access";
import { formatRelativeTime } from "@/lib/format-time";
import { getWebhookRateLimitUsage } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request/client-ip";
import { getInboxEventStats } from "@/lib/store/events";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";
import { inferEventType } from "@/lib/webhooks/parse-request";

export const dynamic = "force-dynamic";

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

  const stats = await getInboxEventStats(id);
  const usage = await getWebhookRateLimitUsage(id, getClientIp(request));

  return Response.json({
    ok: true,
    inboxId: id,
    total: stats.total,
    today: stats.today,
    lastEvent: stats.lastEvent
      ? {
          type: inferEventType(stats.lastEvent.body),
          time: formatRelativeTime(stats.lastEvent.receivedAt),
          receivedAt: stats.lastEvent.receivedAt,
        }
      : null,
    rateLimit: {
      ...usage,
      period: "day",
    },
  });
}
