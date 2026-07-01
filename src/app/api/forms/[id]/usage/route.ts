import { requireReadAccess } from "@/lib/auth/require-access";
import { getFormRateLimitUsage } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request/client-ip";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!PUBLIC_ID_PATTERN.test(id)) {
    return Response.json({ ok: false, error: "invalid form id" }, { status: 400 });
  }

  const access = await requireReadAccess(request, id, "form");
  if (!access.ok) return access.response;

  const usage = await getFormRateLimitUsage(id, getClientIp(request));

  return Response.json({
    ok: true,
    formId: id,
    rateLimit: {
      ...usage,
      period: "month",
    },
  });
}
