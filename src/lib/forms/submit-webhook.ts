import { assertSafeOutboundUrl } from "@/lib/security/ssrf";

export interface SubmissionWebhookPayload {
  formId: string;
  submissionId: string;
  email: string | null;
  message: string | null;
  source: string | null;
  fields: Record<string, string>;
  receivedAt: string;
  spam: boolean;
}

type SendOverride = (url: string, payload: SubmissionWebhookPayload) => Promise<boolean>;

let sendOverride: SendOverride | null = null;

export function setSubmissionWebhookOverride(fn: SendOverride | null): void {
  sendOverride = fn;
}

export async function sendSubmissionWebhook(
  url: string,
  payload: SubmissionWebhookPayload,
): Promise<boolean> {
  if (sendOverride) return sendOverride(url, payload);

  const safeUrl = await assertSafeOutboundUrl(url);
  if (!safeUrl) return false;

  try {
    const response = await fetch(safeUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "hookkit.form.submission",
        form: payload.formId,
        submissionId: payload.submissionId,
        spam: payload.spam,
        email: payload.email,
        message: payload.message,
        source: payload.source,
        fields: payload.fields,
        receivedAt: payload.receivedAt,
      }),
      signal: AbortSignal.timeout(15_000),
      redirect: "manual",
    });
    if (response.status >= 300 && response.status < 400) return false;
    return response.ok;
  } catch {
    return false;
  }
}
