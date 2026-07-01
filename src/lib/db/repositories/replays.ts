import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { events, inboxes, replays } from "@/lib/db/schema";

export interface ReplayRecord {
  id: string;
  inboxId: string;
  eventId: string;
  targetUrl: string;
  statusCode: number | null;
  durationMs: number;
  error: string | null;
  createdAt: string;
}

export interface ReplaySummary {
  replaysThisWeek: number;
  successRate: number;
}

async function getInboxUuid(publicId: string): Promise<string | null> {
  const db = getDb();
  const [inbox] = await db
    .select({ id: inboxes.id })
    .from(inboxes)
    .where(eq(inboxes.publicId, publicId))
    .limit(1);
  return inbox?.id ?? null;
}

export async function appendReplayDb(input: {
  inboxPublicId: string;
  eventId: string;
  targetUrl: string;
  statusCode: number | null;
  durationMs: number;
  error: string | null;
}): Promise<ReplayRecord> {
  const db = getDb();
  const inboxUuid = await getInboxUuid(input.inboxPublicId);
  if (!inboxUuid) throw new Error(`inbox not found: ${input.inboxPublicId}`);

  const [record] = await db
    .insert(replays)
    .values({
      inboxId: inboxUuid,
      eventId: input.eventId,
      targetUrl: input.targetUrl,
      statusCode: input.statusCode,
      durationMs: input.durationMs,
      error: input.error,
    })
    .returning();

  return {
    id: record.id,
    inboxId: input.inboxPublicId,
    eventId: record.eventId,
    targetUrl: record.targetUrl,
    statusCode: record.statusCode,
    durationMs: record.durationMs,
    error: record.error,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function getReplaySummaryDb(inboxPublicId: string): Promise<ReplaySummary> {
  const db = getDb();
  const inboxUuid = await getInboxUuid(inboxPublicId);
  if (!inboxUuid) return { replaysThisWeek: 0, successRate: 100 };

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      statusCode: replays.statusCode,
      error: replays.error,
    })
    .from(replays)
    .where(and(eq(replays.inboxId, inboxUuid), gte(replays.createdAt, weekAgo)))
    .orderBy(desc(replays.createdAt));

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

export async function resolveEventUuid(
  inboxPublicId: string,
  eventId: string,
): Promise<boolean> {
  const db = getDb();
  const inboxUuid = await getInboxUuid(inboxPublicId);
  if (!inboxUuid) return false;

  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.inboxId, inboxUuid)))
    .limit(1);

  return Boolean(row);
}
