import { describe, expect, it } from "vitest";
import { GET as getInboxStats } from "@/app/api/inboxes/[id]/stats/route";
import { appendWebhookEvent } from "@/lib/store/events";
import { DEMO_INBOX_SLUG } from "@/lib/mock-data";

describe("CP-7: inbox stats", () => {
  it("returns today count and last event for guest inbox", async () => {
    await appendWebhookEvent({
      inboxId: DEMO_INBOX_SLUG,
      method: "POST",
      headers: {},
      query: {},
      body: { type: "stats.test" },
    });

    const req = new Request(`http://localhost:3000/api/inboxes/${DEMO_INBOX_SLUG}/stats`);
    const res = await getInboxStats(req, {
      params: Promise.resolve({ id: DEMO_INBOX_SLUG }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      today: number;
      lastEvent: { type: string } | null;
      rateLimit: { limit: number };
    };
    expect(body.today).toBeGreaterThanOrEqual(1);
    expect(body.lastEvent?.type).toBe("stats.test");
    expect(body.rateLimit.limit).toBe(100);
  });
});
