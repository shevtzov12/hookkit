import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { GET as exportSubmissions } from "@/app/api/forms/[id]/submissions/export/route";
import { POST as postForm } from "@/app/f/[id]/route";
import { submissionsToCsv } from "@/lib/forms/export-csv";
import {
  setSubmissionEmailOverride,
} from "@/lib/email/submission-notify";
import { setFormSettings } from "@/lib/forms/settings";
import { appendSubmission } from "@/lib/store/submissions";
import { DEMO_FORM_SLUG } from "@/lib/mock-data";
import { setRateLimitOverrides } from "@/lib/rate-limit";

describe("CP-6: export CSV", () => {
  it("escapes commas and quotes in CSV cells", () => {
    const csv = submissionsToCsv(
      [
        {
          id: "1",
          formId: DEMO_FORM_SLUG,
          fields: { note: 'say "hello", world' },
          email: "a@b.com",
          message: "Hi",
          source: "landing",
          spam: false,
          receivedAt: "2026-06-30T12:00:00.000Z",
        },
      ],
      DEMO_FORM_SLUG,
    );

    expect(csv).toContain('""note""');
    expect(csv).toContain("a@b.com");
  });

  it("returns CSV attachment for guest demo form", async () => {
    await appendSubmission({
      formId: DEMO_FORM_SLUG,
      fields: { email: "export@test.com" },
      email: "export@test.com",
      message: "csv test",
      source: "test",
      spam: false,
    });

    const req = new Request(
      `http://localhost:3000/api/forms/${DEMO_FORM_SLUG}/submissions/export`,
    );
    const res = await exportSubmissions(req, {
      params: Promise.resolve({ id: DEMO_FORM_SLUG }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("export@test.com");
  });
});

describe("CP-6: Resend email notify", () => {
  afterEach(() => {
    setSubmissionEmailOverride(null);
    setRateLimitOverrides({});
  });

  it("calls email sender when emailNotify enabled", async () => {
    await setFormSettings(DEMO_FORM_SLUG, {
      emailNotify: true,
      notifyEmail: "owner@example.com",
    });

    const sent: string[] = [];
    setSubmissionEmailOverride(async (input) => {
      sent.push(input.to);
      return { ok: true, id: "email_1" };
    });

    setRateLimitOverrides({ form: async () => ({ success: true }) });

    const req = new NextRequest(`http://localhost:3000/f/${DEMO_FORM_SLUG}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "visitor@example.com", message: "notify me" }),
    });

    const res = await postForm(req, { params: Promise.resolve({ id: DEMO_FORM_SLUG }) });
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 10));
    expect(sent).toEqual(["owner@example.com"]);
  });

  it("skips email for spam submissions", async () => {
    await setFormSettings(DEMO_FORM_SLUG, {
      emailNotify: true,
      notifyEmail: "owner@example.com",
    });

    const sent: string[] = [];
    setSubmissionEmailOverride(async (input) => {
      sent.push(input.to);
      return { ok: true };
    });

    setRateLimitOverrides({ form: async () => ({ success: true }) });

    const req = new NextRequest(`http://localhost:3000/f/${DEMO_FORM_SLUG}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bot@spam.ru", _gotcha: "filled" }),
    });

    await postForm(req, { params: Promise.resolve({ id: DEMO_FORM_SLUG }) });
    await new Promise((r) => setTimeout(r, 10));
    expect(sent).toEqual([]);
  });
});
