export function isResendEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getResendFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || "HookKit <onboarding@resend.dev>";
}
