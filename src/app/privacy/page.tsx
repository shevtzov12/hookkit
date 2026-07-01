import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="landing">
      <main className="landing-main docs-main">
        <Link href="/" className="landing-name" style={{ textDecoration: "none" }}>
          ← HookKit
        </Link>
        <h1 className="landing-title" style={{ fontSize: "2rem" }}>
          Privacy Policy
        </h1>
        <div className="docs-section legal-copy">
          <p>
            HookKit stores webhook payloads and form submissions you send to your inbox or form
            endpoints. Data is retained per resource limits (500 events/inbox, 1000 submissions/form
            in file mode; configurable in hosted plans).
          </p>
          <p>
            We use optional third-party services when configured: Clerk (auth), Neon (database),
            Upstash (rate limits), Cloudflare Turnstile (spam), Resend (email notifications).
          </p>
          <p>
            Contact: configure your project owner email in deployment settings. Replace this page
            with Termly or iubenda embed before public launch.
          </p>
        </div>
        <div className="landing-actions">
          <Link href="/terms" className="landing-btn landing-btn-ghost">
            Terms of Use
          </Link>
        </div>
      </main>
    </div>
  );
}
