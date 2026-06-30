import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as getFormSubmissions } from "@/app/api/forms/[id]/submissions/route";
import { GET as getInboxEvents } from "@/app/api/inboxes/[id]/events/route";
import { POST as postForm } from "@/app/f/[id]/route";
import { POST as postWebhook } from "@/app/h/[id]/route";
import {
  isHoneypotTripped,
  readFormFields,
  safeRedirectUrl,
} from "@/lib/forms/parse-request";
import { highlightJson } from "@/lib/json-highlight";
import { DEMO_INBOX_SLUG } from "@/lib/mock-data";
import { pickHeaders } from "@/lib/webhooks/parse-request";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";

const XSS_PAYLOADS = [
  '</span><img src=x onerror="alert(1)">',
  "<script>alert(1)</script>",
  '"><svg onload=alert(1)>',
  "javascript:alert(1)",
];

const REDIRECT_JAILBREAKS = [
  "javascript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "//evil.com/phish",
  "/\\evil.com",
  "https://evil.com@trusted.com",
  "\u0000https://evil.com",
];

const PATH_TRAVERSAL_IDS = [
  "../../../etc/passwd",
  "..\\..\\windows",
  "wh_demo_guest%00admin",
  "wh/demo",
  "wh demo",
  "",
  "a".repeat(200),
];

const PROTOTYPE_POLLUTION = [
  '{"__proto__":{"polluted":true}}',
  '{"constructor":{"prototype":{"polluted":true}}}',
];

describe("security: stored XSS in JSON viewer", () => {
  for (const payload of XSS_PAYLOADS) {
    it(`escapes payload in highlightJson: ${payload.slice(0, 30)}`, () => {
      const html = highlightJson({ msg: payload });
      expect(html).not.toMatch(/<script\b/i);
      expect(html).not.toMatch(/<img\b/i);
      expect(html).not.toMatch(/<svg\b/i);
      expect(html).not.toMatch(/<span[^>]*>[^<]*<\/span><img/i);
      if (payload.includes("<")) {
        expect(html).toContain("&lt;");
      }
    });
  }
});

describe("security: open redirect jailbreaks", () => {
  const req = new NextRequest("http://localhost:3000/f/x");

  for (const url of REDIRECT_JAILBREAKS) {
    it(`blocks redirect: ${url.slice(0, 40)}`, () => {
      expect(safeRedirectUrl(url, req)).toBeNull();
    });
  }

  it("allows same-origin relative path", () => {
    expect(safeRedirectUrl("/thank-you", req)).toBe("/thank-you");
  });

  it("blocks external https (open redirect)", () => {
    expect(safeRedirectUrl("https://evil.com/phish", req)).toBeNull();
  });
});

describe("security: path traversal / id injection", () => {
  for (const id of PATH_TRAVERSAL_IDS) {
    it(`rejects id: ${JSON.stringify(id).slice(0, 40)}`, () => {
      expect(PUBLIC_ID_PATTERN.test(id)).toBe(false);
    });
  }
});

describe("security: honeypot jailbreaks", () => {
  it("rejects _gotcha with whitespace-only as not spam", () => {
    expect(isHoneypotTripped({ _gotcha: "   " })).toBe(false);
  });

  it("catches _gotcha with content", () => {
    expect(isHoneypotTripped({ _gotcha: "bot" })).toBe(true);
  });

  it("does not treat _Gotcha (wrong case) as honeypot", () => {
    expect(isHoneypotTripped({ _Gotcha: "bot" })).toBe(false);
  });

  it("catches honeypot in urlencoded body", async () => {
    const req = new NextRequest("http://localhost:3000/f/x", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "email=a@b.co&_gotcha=pwned",
    });
    const parsed = await readFormFields(req);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(isHoneypotTripped(parsed.fields)).toBe(true);
  });
});

describe("security: header leakage", () => {
  it("strips sensitive headers before storage", () => {
    const headers = new Headers({
      authorization: "Bearer secret",
      cookie: "session=abc",
      "x-api-key": "sk_live_x",
      "content-type": "application/json",
    });
    const picked = pickHeaders(headers);
    expect(picked.authorization).toBeUndefined();
    expect(picked.cookie).toBeUndefined();
    expect(picked["x-api-key"]).toBeUndefined();
    expect(picked["content-type"]).toBe("application/json");
  });
});

describe("security: prototype pollution payloads", () => {
  it("parses __proto__ as normal string field in form JSON", async () => {
    const req = new NextRequest("http://localhost:3000/f/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: PROTOTYPE_POLLUTION[0],
    });
    const parsed = await readFormFields(req);
    expect(parsed.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("security: webhook XSS stored + API exposure", () => {
  it("stores XSS payload but highlightJson must not execute", async () => {
    const xss = '</span><img src=x onerror="alert(document.domain)">';
    const req = new NextRequest(`http://localhost:3000/h/${DEMO_INBOX_SLUG}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "attack", msg: xss }),
    });

    const res = await postWebhook(req, { params: Promise.resolve({ id: DEMO_INBOX_SLUG }) });
    expect(res.status).toBe(200);

    const listReq = new Request(`http://localhost:3000/api/inboxes/${DEMO_INBOX_SLUG}/events`);
    const listRes = await getInboxEvents(listReq, {
      params: Promise.resolve({ id: DEMO_INBOX_SLUG }),
    });
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    const payload = listJson.events[0]?.payload as { msg: string };
    expect(payload.msg).toBe(xss);

    const html = highlightJson(payload);
    expect(html).not.toMatch(/<img[^>]*onerror/i);
  });
});

describe("security: IDOR on list APIs (CP-4)", () => {
  it("rejects unauthenticated read of non-guest submissions", async () => {
    const postReq = new NextRequest("http://localhost:3000/f/frm_sec_idor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "secret@corp.io", message: "confidential" }),
    });
    await postForm(postReq, { params: Promise.resolve({ id: "frm_sec_idor" }) });

    const listReq = new Request("http://localhost:3000/api/forms/frm_sec_idor/submissions");
    const listRes = await getFormSubmissions(listReq, {
      params: Promise.resolve({ id: "frm_sec_idor" }),
    });
    expect(listRes.status).toBe(401);
  });

  it("allows public read of guest demo form", async () => {
    const listReq = new Request("http://localhost:3000/api/forms/frm_demo_guest/submissions");
    const listRes = await getFormSubmissions(listReq, {
      params: Promise.resolve({ id: "frm_demo_guest" }),
    });
    expect(listRes.status).toBe(200);
  });
});

describe("security: multipart without content-length", () => {
  it("rejects multipart missing content-length", async () => {
    const boundary = "----HookKitTest";
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="email"\r\n\r\ntest@x.io\r\n--${boundary}--\r\n`;
    const req = new NextRequest("http://localhost:3000/f/x", {
      method: "POST",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      body,
    });
    const parsed = await readFormFields(req);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.status).toBe(411);
  });
});
