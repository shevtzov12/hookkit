import { and, desc, eq, gte, lt } from "drizzle-orm";
import type { ListInboxEventsOptions, ListInboxEventsResult } from "@/lib/store/events";
import type { WebhookEventRecord } from "@/lib/store/types";
import { getDb } from "@/lib/db/client";
import { events, inboxes } from "@/lib/db/schema";
import { DEMO_INBOX_SLUG } from "@/lib/mock-data";

const MAX_EVENTS_PER_INBOX = 500;

async function getInboxUuid(publicId: string) {
  const db = getDb();
  const [inbox] = await db
    .select({ id: inboxes.id })
    .from(inboxes)
    .where(eq(inboxes.publicId, publicId))
    .limit(1);

  if (!inbox) {
    const [created] = await db
      .insert(inboxes)
      .values({
        publicId,
        name: publicId,
        isGuest: publicId === DEMO_INBOX_SLUG,
      })
      .onConflictDoNothing({ target: inboxes.publicId })
      .returning({ id: inboxes.id });

    if (created) return created.id;

    const [existing] = await db
      .select({ id: inboxes.id })
      .from(inboxes)
      .where(eq(inboxes.publicId, publicId))
      .limit(1);
    if (!existing) throw new Error(`inbox not found: ${publicId}`);
    return existing.id;
  }

  return inbox.id;
}

export async function appendWebhookEventDb(
  event: Omit<WebhookEventRecord, "id" | "receivedAt">,
): Promise<WebhookEventRecord> {
  const db = getDb();
  const inboxUuid = await getInboxUuid(event.inboxId);

  const [record] = await db
    .insert(events)
    .values({
      inboxId: inboxUuid,
      method: event.method,
      headers: event.headers,
      query: event.query,
      body: event.body,
    })
    .returning();

  const overflow = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.inboxId, inboxUuid))
    .orderBy(desc(events.receivedAt))
    .offset(MAX_EVENTS_PER_INBOX);

  if (overflow.length > 0) {
    for (const row of overflow) {
      await db.delete(events).where(eq(events.id, row.id));
    }
  }

  return {
    id: record.id,
    inboxId: event.inboxId,
    method: record.method,
    headers: record.headers as Record<string, string>,
    query: record.query as Record<string, string>,
    body: record.body,
    receivedAt: record.receivedAt.toISOString(),
  };
}

export async function getInboxEventByIdDb(
  inboxPublicId: string,
  eventId: string,
): Promise<WebhookEventRecord | null> {
  const db = getDb();
  const [inbox] = await db
    .select({ id: inboxes.id })
    .from(inboxes)
    .where(eq(inboxes.publicId, inboxPublicId))
    .limit(1);

  if (!inbox) return null;

  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.inboxId, inbox.id)))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    inboxId: inboxPublicId,
    method: row.method,
    headers: row.headers as Record<string, string>,
    query: row.query as Record<string, string>,
    body: row.body,
    receivedAt: row.receivedAt.toISOString(),
  };
}

export async function getInboxEventStatsDb(
  inboxPublicId: string,
): Promise<import("@/lib/store/events").InboxEventStats> {
  const db = getDb();
  const [inbox] = await db
    .select({ id: inboxes.id })
    .from(inboxes)
    .where(eq(inboxes.publicId, inboxPublicId))
    .limit(1);

  if (!inbox) {
    return { total: 0, today: 0, lastEvent: null };
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const allRows = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.inboxId, inbox.id));

  const todayRows = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.inboxId, inbox.id), gte(events.receivedAt, todayStart)));

  const [lastRow] = await db
    .select()
    .from(events)
    .where(eq(events.inboxId, inbox.id))
    .orderBy(desc(events.receivedAt))
    .limit(1);

  return {
    total: allRows.length,
    today: todayRows.length,
    lastEvent: lastRow
      ? {
          id: lastRow.id,
          inboxId: inboxPublicId,
          method: lastRow.method,
          headers: lastRow.headers as Record<string, string>,
          query: lastRow.query as Record<string, string>,
          body: lastRow.body,
          receivedAt: lastRow.receivedAt.toISOString(),
        }
      : null,
  };
}

export async function listInboxEventsDb(
  inboxId: string,
  options: ListInboxEventsOptions = {},
): Promise<ListInboxEventsResult> {
  const db = getDb();
  const limit = options.limit ?? 50;

  const [inbox] = await db
    .select({ id: inboxes.id })
    .from(inboxes)
    .where(eq(inboxes.publicId, inboxId))
    .limit(1);

  if (!inbox) {
    return { events: [], nextCursor: null, hasMore: false, total: 0 };
  }

  let cursorReceivedAt: Date | null = null;
  if (options.cursor) {
    const [cursorEvent] = await db
      .select({ receivedAt: events.receivedAt })
      .from(events)
      .where(and(eq(events.id, options.cursor), eq(events.inboxId, inbox.id)))
      .limit(1);
    cursorReceivedAt = cursorEvent?.receivedAt ?? null;
  }

  const whereClause = cursorReceivedAt
    ? and(eq(events.inboxId, inbox.id), lt(events.receivedAt, cursorReceivedAt))
    : eq(events.inboxId, inbox.id);

  const rows = await db
    .select()
    .from(events)
    .where(whereClause)
    .orderBy(desc(events.receivedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const allCount = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.inboxId, inbox.id));

  return {
    events: page.map((row) => ({
      id: row.id,
      inboxId: inboxId,
      method: row.method,
      headers: row.headers as Record<string, string>,
      query: row.query as Record<string, string>,
      body: row.body,
      receivedAt: row.receivedAt.toISOString(),
    })),
    nextCursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
    hasMore,
    total: allCount.length,
  };
}
