import { appendSubmission } from "@/lib/store/submissions";
import { debugLog } from "@/lib/debug-log";import {
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

  const parsed = await readFormFields(request);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  const spam = isHoneypotTripped(parsed.fields);
  const cleanFields = stripInternalFields(parsed.fields);
  const redirectTarget = pickRedirectUrl(parsed.fields, request);
  const safeRedirect = redirectTarget ? safeRedirectUrl(redirectTarget, request) : null;

  // #region agent log
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
  // #endregion

  const record = await appendSubmission({    formId: id,
    fields: cleanFields,
    email: extractEmail(cleanFields),
    message: extractMessage(cleanFields),
    source: extractSource(cleanFields, request),
    spam,
  });

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
