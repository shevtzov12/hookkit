import { getResendFromEmail, isResendEnabled } from "./config";

export interface SubmissionEmailInput {
  formId: string;
  to: string;
  email: string | null;
  message: string | null;
  source: string | null;
  fields: Record<string, string>;
  receivedAt: string;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

type SendOverride = (input: SubmissionEmailInput) => Promise<SendEmailResult>;

let sendOverride: SendOverride | null = null;

export function setSubmissionEmailOverride(fn: SendOverride | null): void {
  sendOverride = fn;
}

function buildHtml(input: SubmissionEmailInput): string {
  const rows = Object.entries(input.fields)
    .map(
      ([key, value]) =>
        `<tr><td style="padding:4px 8px;font-weight:600">${escapeHtml(key)}</td><td style="padding:4px 8px">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `
    <h2>New submission — ${escapeHtml(input.formId)}</h2>
    <p><strong>Email:</strong> ${escapeHtml(input.email ?? "—")}</p>
    <p><strong>Message:</strong> ${escapeHtml(input.message ?? "—")}</p>
    <p><strong>Source:</strong> ${escapeHtml(input.source ?? "—")}</p>
    <p><strong>Received:</strong> ${escapeHtml(input.receivedAt)}</p>
    <table border="1" cellpadding="0" cellspacing="0">${rows}</table>
  `.trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendSubmissionNotification(
  input: SubmissionEmailInput,
): Promise<SendEmailResult> {
  if (sendOverride) return sendOverride(input);

  if (!isResendEnabled()) {
    return { ok: true, skipped: true };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: true, skipped: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getResendFromEmail(),
        to: [input.to],
        subject: `New submission — ${input.formId}`,
        html: buildHtml(input),
      }),
    });

    const data = (await response.json()) as { id?: string; message?: string };
    if (!response.ok) {
      return { ok: false, error: data.message ?? `HTTP ${response.status}` };
    }

    return { ok: true, id: data.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "email send failed",
    };
  }
}
