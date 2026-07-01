export function isTurnstileEnabled(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim(),
  );
}

export function getTurnstileSecretKey(): string | null {
  const key = process.env.TURNSTILE_SECRET_KEY?.trim();
  return key || null;
}

export const TURNSTILE_RESPONSE_FIELD = "cf-turnstile-response";
