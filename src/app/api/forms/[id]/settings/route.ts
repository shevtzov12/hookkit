import { requireReadAccess } from "@/lib/auth/require-access";
import { getFormSettings, setFormSettings, type FormSettings } from "@/lib/forms/settings";
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

  const settings = await getFormSettings(id);
  return Response.json({ ok: true, formId: id, settings });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!PUBLIC_ID_PATTERN.test(id)) {
    return Response.json({ ok: false, error: "invalid form id" }, { status: 400 });
  }

  const access = await requireReadAccess(request, id, "form");
  if (!access.ok) return access.response;

  let body: Partial<FormSettings> = {};
  try {
    body = (await request.json()) as Partial<FormSettings>;
  } catch {
    return Response.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const current = await getFormSettings(id);
  const next: FormSettings = {
    ...current,
    ...body,
  };

  await setFormSettings(id, next);
  return Response.json({ ok: true, formId: id, settings: next });
}
