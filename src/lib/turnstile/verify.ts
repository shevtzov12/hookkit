import { getTurnstileSecretKey, isTurnstileEnabled } from "./config";

export interface TurnstileVerifyResult {
  ok: boolean;
  skipped?: boolean;
  errorCodes?: string[];
}

type SiteverifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

let verifyOverride: ((token: string, remoteIp: string | null) => Promise<TurnstileVerifyResult>) | null =
  null;

/** Test hook — inject mock verifier. */
export function setTurnstileVerifyOverride(
  fn: ((token: string, remoteIp: string | null) => Promise<TurnstileVerifyResult>) | null,
): void {
  verifyOverride = fn;
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp: string | null,
): Promise<TurnstileVerifyResult> {
  if (verifyOverride) {
    return verifyOverride(token ?? "", remoteIp);
  }

  if (!isTurnstileEnabled()) {
    return { ok: true, skipped: true };
  }

  const secret = getTurnstileSecretKey();
  if (!secret) {
    return { ok: true, skipped: true };
  }

  if (!token?.trim()) {
    return { ok: false, errorCodes: ["missing-input-response"] };
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      response: token,
      remoteip: remoteIp ?? undefined,
    }),
  });

  const data = (await response.json()) as SiteverifyResponse;
  return {
    ok: data.success === true,
    errorCodes: data["error-codes"],
  };
}
