import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { readStaticPolicy } from "@/lib/legal/static-policy";
import { getTermlyTermsPolicyId } from "@/lib/termly/config";

export default async function TermsPage() {
  const policyId = getTermlyTermsPolicyId();
  const staticHtml = policyId ? null : await readStaticPolicy("terms-of-use");

  return (
    <LegalPageShell
      title="Terms of Use"
      policyId={policyId}
      staticHtml={staticHtml}
      siblingHref="/privacy"
      siblingLabel="Privacy Policy"
      placeholder={
        <>
          <p>
            Terms of Use file is missing. Add <code>content/legal/terms-of-use.html</code> or set
            Termly embed env vars.
          </p>
        </>
      }
    />
  );
}
