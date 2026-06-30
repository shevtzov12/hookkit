import { auth, currentUser } from "@clerk/nextjs/server";
import { createApiKey, listApiKeys } from "@/lib/auth/api-keys";
import { isClerkEnabled } from "@/lib/auth/config";
import { requireV1Access } from "@/lib/auth/require-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireV1Access(request);
  if (!access.ok) return access.response;

  const keys = await listApiKeys(access.userId!);
  return Response.json({
    ok: true,
    keys: keys.map((k) => ({
      ...k,
      active: !k.revokedAt,
    })),
  });
}

export async function POST(request: Request) {
  if (!isClerkEnabled()) {
    return Response.json(
      { ok: false, error: "clerk not configured" },
      { status: 503 },
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    label?: string;
    environment?: "live" | "test";
  };

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? null;

  const { record, secret } = await createApiKey(userId, {
    label: body.label,
    environment: body.environment,
    email,
  });

  return Response.json({
    ok: true,
    key: record,
    secret,
    warning: "Copy the secret now. It will not be shown again.",
  });
}
