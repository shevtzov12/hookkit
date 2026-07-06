import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { readStaticPolicy } from "@/lib/legal/static-policy";
import { getTermlyCookiePolicyId } from "@/lib/termly/config";

export default async function CookiesPage() {
  const policyId = getTermlyCookiePolicyId();
  const staticHtml = policyId ? null : await readStaticPolicy("cookie-policy");

  return (
    <LegalPageShell
      title="Cookie Policy"
      policyId={policyId}
      staticHtml={staticHtml}
      siblingHref="/privacy"
      siblingLabel="Privacy Policy"
      placeholder={
        <>
          <p>
            Add your Termly HTML export to <code>content/legal/cookie-policy.html</code> (Dashboard
            → Cookie Policy → <strong>Copy HTML</strong>).
          </p>
          <p>
            HookKit uses cookies for authentication (Clerk) and spam protection (Cloudflare
            Turnstile) when enabled.
          </p>
        </>
      }
    />
  );
}
