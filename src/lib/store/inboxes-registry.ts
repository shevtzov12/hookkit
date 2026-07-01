import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEMO_INBOX_SLUG } from "@/lib/mock-data";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";

export interface UserInboxRecord {
  id: string;
  publicId: string;
  name: string;
  createdAt: string;
}

interface InboxRegistryData {
  inboxes: UserInboxRecord[];
}

function getDataDir(): string {
  return process.env.HOOKKIT_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function getRegistryFile(): string {
  return path.join(getDataDir(), "user-inboxes.json");
}

async function readRegistry(): Promise<InboxRegistryData> {
  await mkdir(getDataDir(), { recursive: true });
  try {
    const raw = await readFile(getRegistryFile(), "utf8");
    return JSON.parse(raw) as InboxRegistryData;
  } catch {
    return { inboxes: [] };
  }
}

async function writeRegistry(data: InboxRegistryData): Promise<void> {
  await mkdir(getDataDir(), { recursive: true });
  await writeFile(getRegistryFile(), JSON.stringify(data, null, 2), "utf8");
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `wh_${base || "inbox"}_${suffix}`;
}

export async function listUserInboxesFile(): Promise<UserInboxRecord[]> {
  const registry = await readRegistry();
  return registry.inboxes;
}

export async function createUserInboxFile(name: string): Promise<UserInboxRecord> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("name required");

  let publicId = slugify(trimmed);
  const registry = await readRegistry();

  while (
    registry.inboxes.some((i) => i.publicId === publicId) ||
    publicId === DEMO_INBOX_SLUG ||
    !PUBLIC_ID_PATTERN.test(publicId)
  ) {
    publicId = slugify(trimmed);
  }

  const record: UserInboxRecord = {
    id: crypto.randomUUID(),
    publicId,
    name: trimmed,
    createdAt: new Date().toISOString(),
  };

  registry.inboxes.unshift(record);
  await writeRegistry(registry);
  return record;
}

export async function isFileStoreInbox(publicId: string): Promise<boolean> {
  if (publicId === DEMO_INBOX_SLUG) return true;
  const registry = await readRegistry();
  return registry.inboxes.some((i) => i.publicId === publicId);
}
