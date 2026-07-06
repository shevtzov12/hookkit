import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { readStaticPolicy } from "@/lib/legal/static-policy";
import { getTermlyPrivacyPolicyId } from "@/lib/termly/config";

export default async function PrivacyPage() {
  const policyId = getTermlyPrivacyPolicyId();
  const staticHtml = policyId ? null : await readStaticPolicy("privacy-policy");

  return (
    <LegalPageShell
      title="Privacy Policy"
      policyId={policyId}
      staticHtml={staticHtml}
      siblingHref="/terms"
      siblingLabel="Terms of Use"
      placeholder={
        <>
          <p>
            Add your Termly HTML export to <code>content/legal/privacy-policy.html</code> (Dashboard
            → Privacy Policy → <strong>Copy HTML</strong> — free; embed snippet is paid).
          </p>
          <p>
            HookKit stores webhook payloads and form submissions. Third-party processors when
            configured: Clerk, Neon, Upstash, Cloudflare Turnstile, Resend, Vercel hosting.
          </p>
        </>
      }
    />
  );
}
