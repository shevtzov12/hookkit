import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="landing">
      <main className="landing-main docs-main">
        <Link href="/" className="landing-name" style={{ textDecoration: "none" }}>
          ← HookKit
        </Link>
        <h1 className="landing-title" style={{ fontSize: "2rem" }}>
          Terms of Use
        </h1>
        <div className="docs-section legal-copy">
          <p>
            HookKit is provided as-is for webhook capture and form handling. You are responsible for
            URLs you replay webhooks to, notification recipients, and compliance with laws applicable
            to your form data (GDPR, CAN-SPAM, etc.).
          </p>
          <p>
            Free tier rate limits apply per inbox and form. Abuse may result in throttling or account
            suspension on hosted deployments.
          </p>
          <p>
            Replace this placeholder with Termly or iubenda generated terms before production launch.
          </p>
        </div>
        <div className="landing-actions">
          <Link href="/privacy" className="landing-btn landing-btn-ghost">
            Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  );
}
