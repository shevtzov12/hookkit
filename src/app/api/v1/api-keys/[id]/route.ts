import { auth } from "@clerk/nextjs/server";
import { revokeApiKey } from "@/lib/auth/api-keys";
import {
  isClerkEnabled,
  isLocalFileDevMode,
  LOCAL_DEV_USER_ID,
} from "@/lib/auth/config";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string | null = null;

  if (isLocalFileDevMode()) {
    userId = LOCAL_DEV_USER_ID;
  } else if (isClerkEnabled()) {
    userId = (await auth()).userId;
  }

  if (!userId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const revoked = await revokeApiKey(userId, id);
  if (!revoked) {
    return Response.json({ ok: false, error: "key not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
