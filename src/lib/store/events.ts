import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDatabaseEnabled } from "@/lib/db/client";
import {
  appendWebhookEventDb,
  getInboxEventByIdDb,
  getInboxEventStatsDb,
  listInboxEventsDb,
} from "@/lib/db/repositories/events";
import { MAX_EVENTS_PER_INBOX } from "@/lib/webhooks/constants";
import type { EventStoreData, WebhookEventRecord } from "./types";

export interface ListInboxEventsOptions {
  limit?: number;
  cursor?: string;
}

export interface ListInboxEventsResult {
  events: WebhookEventRecord[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

function getDataDir(): string {
  return process.env.HOOKKIT_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function getEventsFile(): string {
  return path.join(getDataDir(), "events.json");
}

async function ensureStore(): Promise<EventStoreData> {
  const dataDir = getDataDir();
  const eventsFile = getEventsFile();
  await mkdir(dataDir, { recursive: true });
  try {
    const raw = await readFile(eventsFile, "utf8");
    return JSON.parse(raw) as EventStoreData;
  } catch {
    const empty: EventStoreData = { events: [] };
    await writeFile(eventsFile, JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
}

async function saveStore(data: EventStoreData): Promise<void> {
  await mkdir(getDataDir(), { recursive: true });
  await writeFile(getEventsFile(), JSON.stringify(data, null, 2), "utf8");
}

export async function appendWebhookEvent(
  event: Omit<WebhookEventRecord, "id" | "receivedAt">,
): Promise<WebhookEventRecord> {
  if (isDatabaseEnabled()) {
    return appendWebhookEventDb(event);
  }

  const store = await ensureStore();
  const record: WebhookEventRecord = {
    ...event,
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
  };

  store.events.unshift(record);

  const perInbox = store.events.filter((e) => e.inboxId === event.inboxId);
  if (perInbox.length > MAX_EVENTS_PER_INBOX) {
    const dropIds = new Set(perInbox.slice(MAX_EVENTS_PER_INBOX).map((e) => e.id));
    store.events = store.events.filter((e) => !dropIds.has(e.id));
  }

  await saveStore(store);
  return record;
}

export async function listInboxEvents(
  inboxId: string,
  options: ListInboxEventsOptions = {},
): Promise<ListInboxEventsResult> {
  if (isDatabaseEnabled()) {
    return listInboxEventsDb(inboxId, options);
  }

  const limit = options.limit ?? 50;
  const store = await ensureStore();
  const all = store.events
    .filter((e) => e.inboxId === inboxId)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  let slice = all;
  if (options.cursor) {
    const cursorIndex = all.findIndex((e) => e.id === options.cursor);
    slice = cursorIndex >= 0 ? all.slice(cursorIndex + 1) : all;
  }

  const page = slice.slice(0, limit);
  const hasMore = slice.length > limit;

  return {
    events: page,
    nextCursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
    hasMore,
    total: all.length,
  };
}

export async function countInboxEvents(inboxId: string): Promise<number> {
  if (isDatabaseEnabled()) {
    const result = await listInboxEventsDb(inboxId, { limit: 1 });
    return result.total;
  }
  const store = await ensureStore();
  return store.events.filter((e) => e.inboxId === inboxId).length;
}

export async function getInboxEventById(
  inboxId: string,
  eventId: string,
): Promise<WebhookEventRecord | null> {
  if (isDatabaseEnabled()) {
    return getInboxEventByIdDb(inboxId, eventId);
  }

  const store = await ensureStore();
  const record = store.events.find((e) => e.inboxId === inboxId && e.id === eventId);
  return record ?? null;
}

function startOfUtcDay(iso = new Date()): string {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export interface InboxEventStats {
  total: number;
  today: number;
  lastEvent: WebhookEventRecord | null;
}

export async function getInboxEventStats(inboxId: string): Promise<InboxEventStats> {
  if (isDatabaseEnabled()) {
    return getInboxEventStatsDb(inboxId);
  }

  const store = await ensureStore();
  const all = store.events
    .filter((e) => e.inboxId === inboxId)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const todayStart = startOfUtcDay();
  const today = all.filter((e) => e.receivedAt >= todayStart).length;
  return {
    total: all.length,
    today,
    lastEvent: all[0] ?? null,
  };
}
