import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  isHoneypotTripped,
  readFormFields,
  safeRedirectUrl,
  stripInternalFields,
} from "@/lib/forms/parse-request";
import { MAX_WEBHOOK_BODY_BYTES } from "@/lib/webhooks/constants";

function formRequest(
  body: string,
  contentType: string,
  url = "http://localhost:3000/f/frm_demo_guest",
): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

describe("forms/parse-request", () => {
  it("H1: detects honeypot in JSON body", () => {
    const fields = { email: "a@b.co", _gotcha: "bot" };
    expect(isHoneypotTripped(fields)).toBe(true);
    expect(stripInternalFields(fields)).toEqual({ email: "a@b.co" });
  });

  it("H1: detects honeypot in form-urlencoded body", async () => {
    const req = formRequest(
      "email=test%40x.io&message=hi&_gotcha=spam",
      "application/x-www-form-urlencoded",
    );
    const parsed = await readFormFields(req);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(isHoneypotTripped(parsed.fields)).toBe(true);
  });

  it("H4: rejects oversized body without content-length header", async () => {
    const big = "x".repeat(MAX_WEBHOOK_BODY_BYTES + 1);
    const req = formRequest(big, "application/json");
    const parsed = await readFormFields(req);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.status).toBe(413);
  });

  it("H5: allows relative redirect paths", () => {
    const req = new NextRequest("http://localhost:3000/f/x");
    expect(safeRedirectUrl("/thank-you", req)).toBe("/thank-you");
  });

  it("blocks external https (open redirect)", () => {
    const req = new NextRequest("http://localhost:3000/f/x");
    expect(safeRedirectUrl("https://evil.com/phish", req)).toBeNull();
  });

  it("allows same-origin absolute URL as path", () => {
    const req = new NextRequest("http://localhost:3000/f/x");
    expect(safeRedirectUrl("http://localhost:3000/thank-you", req)).toBe("/thank-you");
  });

  it("H5: rejects javascript: redirect", () => {
    const req = new NextRequest("http://localhost:3000/f/x");
    expect(safeRedirectUrl("javascript:alert(1)", req)).toBeNull();
  });
});
