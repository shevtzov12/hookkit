import { auth } from "@clerk/nextjs/server";
import {
  isClerkEnabled,
  isGuestResourcePublicId,
  isLocalFileDevMode,
  LOCAL_DEV_USER_ID,
} from "@/lib/auth/config";
import { verifyApiKey } from "@/lib/auth/api-keys";
import { requireResourceOwnership } from "@/lib/auth/resource-ownership";
import { isDatabaseEnabled } from "@/lib/db/client";
import { isFileStoreForm } from "@/lib/store/forms-registry";
import { isFileStoreInbox } from "@/lib/store/inboxes-registry";

export type AccessResult =
  | { ok: true; userId?: string; via: "guest" | "clerk" | "api-key" }
  | { ok: false; response: Response };

function unauthorized(message = "unauthorized") {
  return {
    ok: false as const,
    response: Response.json({ ok: false, error: message }, { status: 401 }),
  };
}

export async function requireReadAccess(
  request: Request,
  publicId: string,
  type: "inbox" | "form",
): Promise<AccessResult> {
  if (isGuestResourcePublicId(publicId, type)) {
    return { ok: true, via: "guest" };
  }

  if (!isDatabaseEnabled() && !isClerkEnabled()) {
    const known =
      type === "inbox"
        ? await isFileStoreInbox(publicId)
        : await isFileStoreForm(publicId);
    if (known) {
      return { ok: true, via: "guest" };
    }
  }

  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    const verified = await verifyApiKey(bearer.slice(7).trim());
    if (verified) {
      const owned = await requireResourceOwnership(verified.userId, publicId, type);
      if (!owned.ok) {
        return { ok: false, response: owned.response };
      }
      return { ok: true, userId: verified.userId, via: "api-key" };
    }
    return unauthorized("invalid api key");
  }

  if (isClerkEnabled()) {
    const { userId } = await auth();
    if (userId) {
      const owned = await requireResourceOwnership(userId, publicId, type);
      if (!owned.ok) {
        return { ok: false, response: owned.response };
      }
      return { ok: true, userId, via: "clerk" };
    }
    return unauthorized();
  }

  return unauthorized("authentication required for non-guest resources");
}

export async function requireV1Access(request: Request): Promise<AccessResult> {
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    const verified = await verifyApiKey(bearer.slice(7).trim());
    if (verified) {
      return { ok: true, userId: verified.userId, via: "api-key" };
    }
    return unauthorized("invalid api key");
  }

  if (isClerkEnabled()) {
    const { userId } = await auth();
    if (userId) {
      return { ok: true, userId, via: "clerk" };
    }
    return unauthorized();
  }

  if (isLocalFileDevMode()) {
    return { ok: true, userId: LOCAL_DEV_USER_ID, via: "guest" };
  }

  return unauthorized("clerk or api key required");
}
