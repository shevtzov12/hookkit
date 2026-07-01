import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as replayEvent } from "@/app/api/inboxes/[id]/events/[eventId]/replay/route";
import { POST as postForm } from "@/app/f/[id]/route";
import { POST as postWebhook } from "@/app/h/[id]/route";
import { setInboxReplayUrl } from "@/lib/inboxes/status";
import { setRateLimitOverrides } from "@/lib/rate-limit";
import { assertSafeOutboundUrl } from "@/lib/security/ssrf";
import { appendWebhookEvent, getInboxEventById } from "@/lib/store/events";
import { DEMO_FORM_SLUG, DEMO_INBOX_SLUG } from "@/lib/mock-data";
import {
  setTurnstileVerifyOverride,
} from "@/lib/turnstile/verify";
import { replayWebhookEvent } from "@/lib/webhooks/replay";

describe("CP-5: rate limits", () => {
  beforeEach(() => {
    setRateLimitOverrides({});
  });

  afterEach(() => {
    setRateLimitOverrides({});
  });

  it("returns 429 when webhook limiter rejects", async () => {
    setRateLimitOverrides({
      webhook: async () => ({ success: false, reset: Date.now() + 60_000 }),
    });

    const req = new NextRequest(`http://localhost:3000/h/${DEMO_INBOX_SLUG}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "test" }),
    });

    const res = await postWebhook(req, { params: Promise.resolve({ id: DEMO_INBOX_SLUG }) });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("returns 429 when form limiter rejects", async () => {
    setRateLimitOverrides({
      form: async () => ({ success: false, reset: Date.now() + 120_000 }),
    });

    const req = new NextRequest(`http://localhost:3000/f/${DEMO_FORM_SLUG}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", message: "hi" }),
    });

    const res = await postForm(req, { params: Promise.resolve({ id: DEMO_FORM_SLUG }) });
    expect(res.status).toBe(429);
  });
});

describe("CP-5: Turnstile", () => {
  afterEach(() => {
    setTurnstileVerifyOverride(null);
    setRateLimitOverrides({});
  });

  it("marks submission as spam when turnstile fails", async () => {
    setRateLimitOverrides({
      form: async () => ({ success: true }),
    });

    const { setFormSettings } = await import("@/lib/forms/settings");
    await setFormSettings(DEMO_FORM_SLUG, { turnstileEnabled: true });

    setTurnstileVerifyOverride(async () => ({ ok: false, errorCodes: ["invalid-input-response"] }));

    const req = new NextRequest(`http://localhost:3000/f/${DEMO_FORM_SLUG}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bot@spam.ru", message: "nope" }),
    });

    const res = await postForm(req, { params: Promise.resolve({ id: DEMO_FORM_SLUG }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { spam: boolean };
    expect(body.spam).toBe(true);
  });

  it("marks submission as spam when turnstile is enabled but verification is skipped", async () => {
    setRateLimitOverrides({
      form: async () => ({ success: true }),
    });

    const { setFormSettings } = await import("@/lib/forms/settings");
    await setFormSettings(DEMO_FORM_SLUG, { turnstileEnabled: true });

    setTurnstileVerifyOverride(async () => ({ ok: true, skipped: true }));

    const req = new NextRequest(`http://localhost:3000/f/${DEMO_FORM_SLUG}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", message: "hi" }),
    });

    const res = await postForm(req, { params: Promise.resolve({ id: DEMO_FORM_SLUG }) });
    const body = (await res.json()) as { spam: boolean };
    expect(body.spam).toBe(true);
  });
});

describe("CP-5: replay SSRF", () => {
  it("blocks localhost replay URLs", async () => {
    await expect(assertSafeOutboundUrl("http://127.0.0.1/hook")).resolves.toBeNull();
    await expect(assertSafeOutboundUrl("http://localhost/admin")).resolves.toBeNull();
  });

  it("allows public https URLs", async () => {
    const url = await assertSafeOutboundUrl("https://example.com/webhook");
    expect(url?.hostname).toBe("example.com");
  });
});

describe("CP-5: replay API", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("replays stored event to configured URL", async () => {
    await setInboxReplayUrl(DEMO_INBOX_SLUG, "https://example.com/replay-target");

    const stored = await appendWebhookEvent({
      inboxId: DEMO_INBOX_SLUG,
      method: "POST",
      headers: { "content-type": "application/json" },
      query: { source: "test" },
      body: { hello: "world" },
    });

    globalThis.fetch = vi.fn(async () =>
      new Response("ok", { status: 201, headers: { "Content-Type": "text/plain" } }),
    ) as typeof fetch;

    const result = await replayWebhookEvent(
      (await getInboxEventById(DEMO_INBOX_SLUG, stored.id))!,
      "https://example.com/replay-target",
    );

    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(201);

    const req = new Request(
      `http://localhost:3000/api/inboxes/${DEMO_INBOX_SLUG}/events/${stored.id}/replay`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    );

    const res = await replayEvent(req, {
      params: Promise.resolve({ id: DEMO_INBOX_SLUG, eventId: stored.id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; statusCode: number };
    expect(body.ok).toBe(true);
    expect(body.statusCode).toBe(201);
  });

  it("rejects unsafe replay URL", async () => {
    const stored = await appendWebhookEvent({
      inboxId: DEMO_INBOX_SLUG,
      method: "POST",
      headers: {},
      query: {},
      body: { ping: true },
    });

    const req = new Request(
      `http://localhost:3000/api/inboxes/${DEMO_INBOX_SLUG}/events/${stored.id}/replay`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "http://127.0.0.1/internal" }),
      },
    );

    const res = await replayEvent(req, {
      params: Promise.resolve({ id: DEMO_INBOX_SLUG, eventId: stored.id }),
    });
    expect(res.status).toBe(400);
  });
});

describe("CP-5: getEventById", () => {
  it("returns event by inbox + id", async () => {
    const stored = await appendWebhookEvent({
      inboxId: DEMO_INBOX_SLUG,
      method: "POST",
      headers: {},
      query: {},
      body: { id: "evt" },
    });

    const found = await getInboxEventById(DEMO_INBOX_SLUG, stored.id);
    expect(found?.id).toBe(stored.id);
  });
});
