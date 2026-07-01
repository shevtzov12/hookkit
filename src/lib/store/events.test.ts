import { describe, expect, it } from "vitest";
import { appendWebhookEvent, getInboxEventStats, listInboxEvents } from "@/lib/store/events";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";

describe("store/events pagination", () => {
  it("H2: paginates without overlapping events", async () => {
    const inboxId = "wh_test_pagination";
    const ids: string[] = [];

    for (let i = 0; i < 5; i++) {
      const record = await appendWebhookEvent({
        inboxId,
        method: "POST",
        headers: {},
        query: {},
        body: { n: i },
      });
      ids.push(record.id);
    }

    const page1 = await listInboxEvents(inboxId, { limit: 2 });
    expect(page1.events).toHaveLength(2);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBe(page1.events[1].id);

    const page2 = await listInboxEvents(inboxId, {
      limit: 2,
      cursor: page1.nextCursor ?? undefined,
    });
    expect(page2.events).toHaveLength(2);
    expect(page2.events[0].id).not.toBe(page1.events[0].id);
    expect(page2.events[0].id).not.toBe(page1.events[1].id);
  });
});

describe("store/events stats", () => {
  it("returns newest event per inbox when events are interleaved", async () => {
    const inboxA = "wh_stats_a";
    const inboxB = "wh_stats_b";

    await appendWebhookEvent({
      inboxId: inboxA,
      method: "POST",
      headers: {},
      query: {},
      body: { n: 1 },
    });
    await appendWebhookEvent({
      inboxId: inboxB,
      method: "POST",
      headers: {},
      query: {},
      body: { n: 2 },
    });
    const latestA = await appendWebhookEvent({
      inboxId: inboxA,
      method: "POST",
      headers: {},
      query: {},
      body: { type: "latest.a" },
    });

    const stats = await getInboxEventStats(inboxA);
    expect(stats.lastEvent?.id).toBe(latestA.id);
    expect(stats.total).toBe(2);
  });
});

describe("PUBLIC_ID_PATTERN", () => {
  it("H3: rejects invalid inbox ids", () => {
    expect(PUBLIC_ID_PATTERN.test("")).toBe(false);
    expect(PUBLIC_ID_PATTERN.test("bad id")).toBe(false);
    expect(PUBLIC_ID_PATTERN.test("../../../etc")).toBe(false);
    expect(PUBLIC_ID_PATTERN.test("wh_demo_guest")).toBe(true);
  });
});
