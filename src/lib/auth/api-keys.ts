import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { getDb, isDatabaseEnabled } from "@/lib/db/client";
import { apiKeys, users } from "@/lib/db/schema";

export interface ApiKeyRecord {
  id: string;
  userId: string;
  keyPrefix: string;
  label: string;
  environment: "live" | "test";
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ApiKeyStoreFile {
  keys: Array<ApiKeyRecord & { keyHash: string }>;
}

function getKeysFile(): string {
  const dir = process.env.HOOKKIT_DATA_DIR ?? path.join(process.cwd(), ".data");
  return path.join(dir, "api-keys.json");
}

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function generateRawKey(environment: "live" | "test"): string {
  const secret = randomBytes(24).toString("base64url");
  return `sk_${environment}_${secret}`;
}

async function readFileStore(): Promise<ApiKeyStoreFile> {
  await mkdir(path.dirname(getKeysFile()), { recursive: true });
  try {
    const raw = await readFile(getKeysFile(), "utf8");
    return JSON.parse(raw) as ApiKeyStoreFile;
  } catch {
    return { keys: [] };
  }
}

async function writeFileStore(data: ApiKeyStoreFile): Promise<void> {
  await mkdir(path.dirname(getKeysFile()), { recursive: true });
  await writeFile(getKeysFile(), JSON.stringify(data, null, 2), "utf8");
}

async function ensureDbUser(clerkUserId: string, email?: string | null) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({
      clerkId: clerkUserId,
      email: email ?? `${clerkUserId}@users.hookkit.local`,
    })
    .returning();
  return created;
}

export async function createApiKey(
  userId: string,
  options: { label?: string; environment?: "live" | "test"; email?: string | null } = {},
): Promise<{ record: ApiKeyRecord; secret: string }> {
  const environment = options.environment ?? "live";
  const secret = generateRawKey(environment);
  const keyHash = hashKey(secret);
  const keyPrefix = `${secret.slice(0, 12)}…${secret.slice(-4)}`;

  if (isDatabaseEnabled()) {
    const dbUser = await ensureDbUser(userId, options.email);
    const db = getDb();
    const [row] = await db
      .insert(apiKeys)
      .values({
        userId: dbUser.id,
        keyHash,
        keyPrefix,
        label: options.label ?? "default",
        environment,
      })
      .returning();

    return {
      secret,
      record: {
        id: row.id,
        userId,
        keyPrefix: row.keyPrefix,
        label: row.label,
        environment: row.environment as "live" | "test",
        revokedAt: row.revokedAt?.toISOString() ?? null,
        lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      },
    };
  }

  const store = await readFileStore();
  const record: ApiKeyRecord = {
    id: crypto.randomUUID(),
    userId,
    keyPrefix,
    label: options.label ?? "default",
    environment,
    revokedAt: null,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
  };
  store.keys.unshift({ ...record, keyHash });
  await writeFileStore(store);
  return { record, secret };
}

export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  if (isDatabaseEnabled()) {
    const db = getDb();
    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);
    if (!dbUser) return [];

    const rows = await db.select().from(apiKeys).where(eq(apiKeys.userId, dbUser.id));

    return rows.map((row) => ({
      id: row.id,
      userId,
      keyPrefix: row.keyPrefix,
      label: row.label,
      environment: row.environment as "live" | "test",
      revokedAt: row.revokedAt?.toISOString() ?? null,
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  const store = await readFileStore();
  return store.keys
    .filter((k) => k.userId === userId)
    .map(({ keyHash: _omit, ...record }) => {
      void _omit;
      return record;
    });
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  if (isDatabaseEnabled()) {
    const db = getDb();
    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);
    if (!dbUser) return false;

    const [row] = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, dbUser.id)))
      .returning({ id: apiKeys.id });
    return Boolean(row);
  }

  const store = await readFileStore();
  const target = store.keys.find((k) => k.id === keyId && k.userId === userId);
  if (!target) return false;
  target.revokedAt = new Date().toISOString();
  await writeFileStore(store);
  return true;
}

export async function verifyApiKey(
  rawKey: string,
): Promise<{ userId: string; keyId: string } | null> {
  if (!rawKey.startsWith("sk_live_") && !rawKey.startsWith("sk_test_")) {
    return null;
  }

  const keyHash = hashKey(rawKey);
  const now = new Date().toISOString();

  if (isDatabaseEnabled()) {
    const db = getDb();
    const [row] = await db
      .select({
        id: apiKeys.id,
        revokedAt: apiKeys.revokedAt,
        clerkId: users.clerkId,
      })
      .from(apiKeys)
      .innerJoin(users, eq(apiKeys.userId, users.id))
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);

    if (!row || row.revokedAt) return null;

    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id));
    return { userId: row.clerkId ?? row.id, keyId: row.id };
  }

  const store = await readFileStore();
  const row = store.keys.find((k) => k.keyHash === keyHash && !k.revokedAt);
  if (!row) return null;
  row.lastUsedAt = now;
  await writeFileStore(store);
  return { userId: row.userId, keyId: row.id };
}
