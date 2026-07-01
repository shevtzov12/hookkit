import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDatabaseEnabled } from "@/lib/db/client";
import {
  appendReplayDb,
  getReplaySummaryDb,
  type ReplayRecord,
  type ReplaySummary,
} from "@/lib/db/repositories/replays";

interface ReplayStoreData {
  replays: ReplayRecord[];
}

function getDataDir(): string {
  return process.env.HOOKKIT_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function getReplaysFile(): string {
  return path.join(getDataDir(), "replays.json");
}

async function ensureStore(): Promise<ReplayStoreData> {
  await mkdir(getDataDir(), { recursive: true });
  try {
    const raw = await readFile(getReplaysFile(), "utf8");
    return JSON.parse(raw) as ReplayStoreData;
  } catch {
    const empty: ReplayStoreData = { replays: [] };
    await writeFile(getReplaysFile(), JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
}

async function saveStore(data: ReplayStoreData): Promise<void> {
  await mkdir(getDataDir(), { recursive: true });
  await writeFile(getReplaysFile(), JSON.stringify(data, null, 2), "utf8");
}

export async function appendReplay(input: {
  inboxId: string;
  eventId: string;
  targetUrl: string;
  statusCode: number | null;
  durationMs: number;
  error: string | null;
}): Promise<ReplayRecord> {
  if (isDatabaseEnabled()) {
    return appendReplayDb({
      inboxPublicId: input.inboxId,
      eventId: input.eventId,
      targetUrl: input.targetUrl,
      statusCode: input.statusCode,
      durationMs: input.durationMs,
      error: input.error,
    });
  }

  const store = await ensureStore();
  const record: ReplayRecord = {
    id: crypto.randomUUID(),
    inboxId: input.inboxId,
    eventId: input.eventId,
    targetUrl: input.targetUrl,
    statusCode: input.statusCode,
    durationMs: input.durationMs,
    error: input.error,
    createdAt: new Date().toISOString(),
  };

  store.replays.unshift(record);
  await saveStore(store);
  return record;
}

export async function getReplaySummary(inboxId: string): Promise<ReplaySummary> {
  if (isDatabaseEnabled()) {
    return getReplaySummaryDb(inboxId);
  }

  const store = await ensureStore();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const rows = store.replays.filter(
    (row) => row.inboxId === inboxId && Date.parse(row.createdAt) >= weekAgo,
  );

  if (rows.length === 0) {
    return { replaysThisWeek: 0, successRate: 100 };
  }

  const successes = rows.filter(
    (row) => row.error === null && row.statusCode !== null && row.statusCode >= 200 && row.statusCode < 300,
  ).length;

  return {
    replaysThisWeek: rows.length,
    successRate: Math.round((successes / rows.length) * 100),
  };
}

export type { ReplayRecord, ReplaySummary };
