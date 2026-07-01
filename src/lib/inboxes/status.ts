import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseEnabled } from "@/lib/db/client";
import { inboxes } from "@/lib/db/schema";

export interface InboxSettings {
  paused?: boolean;
  replayUrl?: string | null;
}

function getDataDir(): string {
  return process.env.HOOKKIT_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function getSettingsFile(): string {
  return path.join(getDataDir(), "inbox-settings.json");
}

async function readFileSettings(): Promise<Record<string, InboxSettings>> {
  await mkdir(getDataDir(), { recursive: true });
  try {
    const raw = await readFile(getSettingsFile(), "utf8");
    return JSON.parse(raw) as Record<string, InboxSettings>;
  } catch {
    return {};
  }
}

export async function getInboxSettings(publicId: string): Promise<InboxSettings> {
  if (isDatabaseEnabled()) {
    const db = getDb();
    const [row] = await db
      .select({ paused: inboxes.paused, replayUrl: inboxes.replayUrl })
      .from(inboxes)
      .where(eq(inboxes.publicId, publicId))
      .limit(1);

    if (!row) return { paused: false, replayUrl: null };
    return { paused: row.paused, replayUrl: row.replayUrl ?? null };
  }

  const all = await readFileSettings();
  return all[publicId] ?? { paused: false, replayUrl: null };
}

export async function isInboxPaused(publicId: string): Promise<boolean> {
  const settings = await getInboxSettings(publicId);
  return settings.paused === true;
}

export async function setInboxReplayUrl(
  publicId: string,
  replayUrl: string | null,
): Promise<void> {
  if (isDatabaseEnabled()) {
    const db = getDb();
    await db.update(inboxes).set({ replayUrl }).where(eq(inboxes.publicId, publicId));
    return;
  }

  const all = await readFileSettings();
  all[publicId] = { ...all[publicId], replayUrl };
  await writeFile(getSettingsFile(), JSON.stringify(all, null, 2), "utf8");
}
