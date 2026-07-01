import { requireReadAccess } from "@/lib/auth/require-access";
import { getInboxSettings, setInboxReplayUrl } from "@/lib/inboxes/status";
import { getReplaySummary } from "@/lib/store/replays";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";

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

  const summary = await getReplaySummary(id);
  const settings = await getInboxSettings(id);

  return Response.json({
    ok: true,
    inboxId: id,
    replayUrl: settings.replayUrl ?? null,
    ...summary,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!PUBLIC_ID_PATTERN.test(id)) {
    return Response.json({ ok: false, error: "invalid inbox id" }, { status: 400 });
  }

  const access = await requireReadAccess(request, id, "inbox");
  if (!access.ok) return access.response;

  let body: { replayUrl?: string | null } = {};
  try {
    body = (await request.json()) as { replayUrl?: string | null };
  } catch {
    return Response.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  if (body.replayUrl !== undefined) {
    const value = body.replayUrl?.trim() || null;
    await setInboxReplayUrl(id, value);
  }

  const settings = await getInboxSettings(id);
  return Response.json({ ok: true, replayUrl: settings.replayUrl ?? null });
}
