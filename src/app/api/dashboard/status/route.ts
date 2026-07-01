import { isClerkEnabled } from "@/lib/auth/config";
import { isRateLimitEnabled } from "@/lib/rate-limit";
import { isResendEnabled } from "@/lib/email/config";
import { isTurnstileEnabled } from "@/lib/turnstile/config";
import { isDatabaseEnabled } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    storage: isDatabaseEnabled() ? "neon" : "file",
    clerk: isClerkEnabled(),
    upstash: isRateLimitEnabled(),
    resend: isResendEnabled(),
    turnstile: isTurnstileEnabled(),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  });
}
