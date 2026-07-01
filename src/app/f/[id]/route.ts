import { appendSubmission } from "@/lib/store/submissions";
import { debugLog } from "@/lib/debug-log";
import { sendSubmissionNotification } from "@/lib/email/submission-notify";
import { sendSubmissionWebhook } from "@/lib/forms/submit-webhook";
import { getFormSettings } from "@/lib/forms/settings";
import {
  extractEmail,
  extractMessage,
  extractSource,
  isHoneypotTripped,
  pickRedirectUrl,
  readFormFields,
  safeRedirectUrl,
  stripInternalFields,
  wantsHtmlResponse,
} from "@/lib/forms/parse-request";
import { checkFormRateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request/client-ip";
import { TURNSTILE_RESPONSE_FIELD } from "@/lib/turnstile/config";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!PUBLIC_ID_PATTERN.test(id)) {
    return Response.json({ ok: false, error: "invalid form id" }, { status: 400 });
  }

  const clientIp = getClientIp(request);
  const rateLimit = await checkFormRateLimit(id, clientIp);
  if (!rateLimit.success) {
    return Response.json(
      { ok: false, error: "rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(rateLimit.reset)) },
      },
    );
  }

  const parsed = await readFormFields(request);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  const formSettings = await getFormSettings(id);
  let spam = isHoneypotTripped(parsed.fields);

  if (!spam && formSettings.turnstileEnabled) {
    const turnstile = await verifyTurnstileToken(
      parsed.fields[TURNSTILE_RESPONSE_FIELD],
      clientIp === "unknown" ? null : clientIp,
    );
    if (turnstile.skipped || !turnstile.ok) {
      spam = true;
    }
  }

  const cleanFields = stripInternalFields(parsed.fields);
  const redirectTarget = pickRedirectUrl(parsed.fields, request);
  const safeRedirect = redirectTarget ? safeRedirectUrl(redirectTarget, request) : null;

  debugLog(
    "f/[id]/route.ts:POST",
    "form parsed",
    {
      formId: id,
      spam,
      hasRedirect: Boolean(redirectTarget),
      safeRedirect: safeRedirect ?? null,
      fieldKeys: Object.keys(cleanFields),
    },
    spam ? "H1" : "H5",
  );

  const record = await appendSubmission({
    formId: id,
    fields: cleanFields,
    email: extractEmail(cleanFields),
    message: extractMessage(cleanFields),
    source: extractSource(cleanFields, request),
    spam,
  });

  if (!spam && formSettings.emailNotify && formSettings.notifyEmail?.trim()) {
    void sendSubmissionNotification({
      formId: id,
      to: formSettings.notifyEmail.trim(),
      email: record.email,
      message: record.message,
      source: record.source,
      fields: cleanFields,
      receivedAt: record.receivedAt,
    });
  }

  if (!spam && formSettings.webhookOnSubmit && formSettings.webhookUrl?.trim()) {
    void sendSubmissionWebhook(formSettings.webhookUrl.trim(), {
      formId: id,
      submissionId: record.id,
      email: record.email,
      message: record.message,
      source: record.source,
      fields: cleanFields,
      receivedAt: record.receivedAt,
      spam,
    });
  }

  if (safeRedirect && wantsHtmlResponse(request)) {
    return Response.redirect(safeRedirect, 303);
  }

  if (safeRedirect) {
    return Response.json(
      {
        ok: true,
        submissionId: record.id,
        form: id,
        spam,
        redirect: safeRedirect,
        receivedAt: record.receivedAt,
      },
      { status: 200 },
    );
  }

  return Response.json(
    {
      ok: true,
      submissionId: record.id,
      form: id,
      spam,
      receivedAt: record.receivedAt,
    },
    { status: 200 },
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return Response.json({
    ok: true,
    form: id,
    methods: ["POST"],
    honeypot: "_gotcha",
    maxBodyBytes: 262144,
    hint: "POST JSON or form fields. Add _gotcha honeypot (hidden). Optional redirect via _redirect or ?redirect=.",
    example: `Invoke-RestMethod -Uri ${base}/f/${id} -Method POST -ContentType "application/json" -Body '{"email":"you@example.com","message":"Hi"}'`,
  });
}
