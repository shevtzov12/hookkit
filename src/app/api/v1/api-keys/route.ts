import { auth, currentUser } from "@clerk/nextjs/server";
import { createApiKey, listApiKeys } from "@/lib/auth/api-keys";
import {
  isClerkEnabled,
  isLocalFileDevMode,
  LOCAL_DEV_USER_ID,
} from "@/lib/auth/config";
import { requireV1Access } from "@/lib/auth/require-access";

export const dynamic = "force-dynamic";

async function resolveApiKeyUserId(): Promise<string | null> {
  if (isLocalFileDevMode()) return LOCAL_DEV_USER_ID;

  if (!isClerkEnabled()) return null;

  const { userId } = await auth();
  return userId;
}

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
  const userId = await resolveApiKeyUserId();
  if (!userId) {
    return Response.json(
      { ok: false, error: "clerk not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    label?: string;
    environment?: "live" | "test";
  };

  let email: string | null = null;
  if (isClerkEnabled()) {
    const user = await currentUser();
    email = user?.emailAddresses[0]?.emailAddress ?? null;
  }

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
