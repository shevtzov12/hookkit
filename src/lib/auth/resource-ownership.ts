import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { isGuestResourcePublicId } from "@/lib/auth/config";
import { getDb, isDatabaseEnabled } from "@/lib/db/client";
import { forms, inboxes, users } from "@/lib/db/schema";

interface ResourceOwnersFile {
  inboxes: Record<string, string>;
  forms: Record<string, string>;
}

function getOwnersFile(): string {
  const dir = process.env.HOOKKIT_DATA_DIR ?? path.join(process.cwd(), ".data");
  return path.join(dir, "resource-owners.json");
}

function forbidden(message = "forbidden") {
  return {
    ok: false as const,
    response: Response.json({ ok: false, error: message }, { status: 403 }),
  };
}

function notFound(message = "not found") {
  return {
    ok: false as const,
    response: Response.json({ ok: false, error: message }, { status: 404 }),
  };
}

async function readOwnersFile(): Promise<ResourceOwnersFile> {
  await mkdir(path.dirname(getOwnersFile()), { recursive: true });
  try {
    const raw = await readFile(getOwnersFile(), "utf8");
    return JSON.parse(raw) as ResourceOwnersFile;
  } catch {
    return { inboxes: {}, forms: {} };
  }
}

async function writeOwnersFile(data: ResourceOwnersFile): Promise<void> {
  await mkdir(path.dirname(getOwnersFile()), { recursive: true });
  await writeFile(getOwnersFile(), JSON.stringify(data, null, 2), "utf8");
}

async function requireFileResourceOwnership(
  clerkUserId: string,
  publicId: string,
  type: "inbox" | "form",
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const store = await readOwnersFile();
  const map = type === "inbox" ? store.inboxes : store.forms;
  const owner = map[publicId];

  if (!owner) {
    map[publicId] = clerkUserId;
    await writeOwnersFile(store);
    return { ok: true };
  }

  if (owner !== clerkUserId) {
    return forbidden();
  }

  return { ok: true };
}

async function requireDbResourceOwnership(
  clerkUserId: string,
  publicId: string,
  type: "inbox" | "form",
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const db = getDb();
  const table = type === "inbox" ? inboxes : forms;

  const [row] = await db
    .select({
      userId: table.userId,
      isGuest: table.isGuest,
      clerkId: users.clerkId,
    })
    .from(table)
    .leftJoin(users, eq(table.userId, users.id))
    .where(eq(table.publicId, publicId))
    .limit(1);

  if (!row) {
    return notFound(`${type} not found`);
  }

  if (isGuestResourcePublicId(publicId, type)) {
    return { ok: true };
  }

  if (!row.userId || !row.clerkId) {
    return forbidden("resource has no owner");
  }

  if (row.clerkId !== clerkUserId) {
    return forbidden();
  }

  return { ok: true };
}

export async function requireResourceOwnership(
  clerkUserId: string,
  publicId: string,
  type: "inbox" | "form",
): Promise<{ ok: true } | { ok: false; response: Response }> {
  if (isGuestResourcePublicId(publicId, type)) {
    return { ok: true };
  }

  if (isDatabaseEnabled()) {
    return requireDbResourceOwnership(clerkUserId, publicId, type);
  }

  return requireFileResourceOwnership(clerkUserId, publicId, type);
}

export async function assignDbResourceOwner(
  clerkUserId: string,
  publicId: string,
  type: "inbox" | "form",
): Promise<void> {
  if (!isDatabaseEnabled()) return;

  const db = getDb();
  let [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);

  if (!dbUser) {
    [dbUser] = await db
      .insert(users)
      .values({ clerkId: clerkUserId, email: `${clerkUserId}@users.hookkit.local` })
      .returning({ id: users.id });
  }

  const table = type === "inbox" ? inboxes : forms;
  await db
    .update(table)
    .set({ userId: dbUser.id })
    .where(and(eq(table.publicId, publicId), eq(table.isGuest, false)));
}
