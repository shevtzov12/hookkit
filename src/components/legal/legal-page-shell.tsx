import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/legal/site-footer";
import { StaticPolicyContent } from "@/components/legal/static-policy-content";
import { TermlyPolicyEmbed } from "@/components/legal/termly-policy-embed";

type LegalPageShellProps = {
  title: string;
  policyId?: string;
  staticHtml?: string | null;
  siblingHref: "/privacy" | "/terms";
  siblingLabel: string;
  placeholder: ReactNode;
};

export function LegalPageShell({
  title,
  policyId,
  staticHtml,
  siblingHref,
  siblingLabel,
  placeholder,
}: LegalPageShellProps) {
  return (
    <div className="landing">
      <div className="landing-grid" aria-hidden />
      <main className="landing-main docs-main legal-page">
        <Link href="/dashboard" className="landing-name" style={{ textDecoration: "none" }}>
          ← Dashboard
        </Link>
        <h1 className="landing-title" style={{ fontSize: "2rem" }}>
          {title}
        </h1>

        {policyId ? (
          <div className="legal-embed">
            <TermlyPolicyEmbed policyId={policyId} />
          </div>
        ) : staticHtml ? (
          <div className="legal-embed">
            <StaticPolicyContent html={staticHtml} />
          </div>
        ) : (
          <div className="docs-section legal-copy legal-placeholder">{placeholder}</div>
        )}

        <div className="landing-actions">
          <Link href={siblingHref} className="landing-btn landing-btn-ghost">
            {siblingLabel}
          </Link>
        </div>

        <SiteFooter />
      </main>
    </div>
  );
}
