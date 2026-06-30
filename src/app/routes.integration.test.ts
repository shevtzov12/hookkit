import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST as postForm } from "@/app/f/[id]/route";
import { POST as postWebhook } from "@/app/h/[id]/route";
import { listFormSubmissions } from "@/lib/store/submissions";

describe("route handlers integration", () => {
  it("H1: form route marks honeypot submissions as spam", async () => {
    const req = new NextRequest("http://localhost:3000/f/frm_test_route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "bot@spam.ru", _gotcha: "filled" }),
    });

    const res = await postForm(req, { params: Promise.resolve({ id: "frm_test_route" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.spam).toBe(true);

    const list = await listFormSubmissions("frm_test_route", { includeSpam: true });
    expect(list.submissions[0]?.spam).toBe(true);
  });

  it("H1: webhook route stores valid JSON event", async () => {
    const req = new NextRequest("http://localhost:3000/h/wh_test_route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "test.ping", ok: true }),
    });

    const res = await postWebhook(req, { params: Promise.resolve({ id: "wh_test_route" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.type).toBe("test.ping");
  });

  it("H3: webhook route rejects invalid id", async () => {
    const req = new NextRequest("http://localhost:3000/h/bad%20id", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    const res = await postWebhook(req, { params: Promise.resolve({ id: "bad id" }) });
    expect(res.status).toBe(400);
  });
});
