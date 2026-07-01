import Link from "next/link";

export default function HomePage() {
  return (
    <div className="landing">
      <div className="landing-grid" aria-hidden />
      <main className="landing-main">
        <div className="landing-logo">
          <span className="landing-mark">HK</span>
          <span className="landing-name">HookKit</span>
        </div>
        <h1 className="landing-title">
          Webhooks + Forms.
          <br />
          No server. No AI.
        </h1>
        <p className="landing-lead">
          Catch webhook payloads, replay to your API, and accept form submissions from static
          sites — API-first, with keys, rate limits, and Turnstile spam protection.
        </p>
        <div className="landing-actions">
          <Link href="/dashboard" className="landing-btn landing-btn-primary">
            Open dashboard
          </Link>
          <Link href="/docs" className="landing-btn landing-btn-ghost">
            API docs
          </Link>
        </div>
        <ul id="features" className="landing-features">
          <li>Webhook Inbox with replay &amp; SSRF-safe forwarding</li>
          <li>Form backend — honeypot, Turnstile, CSV export</li>
          <li>API keys, Clerk auth, Upstash rate limits</li>
          <li>Email notifications via Resend (optional)</li>
        </ul>
        <footer className="landing-footer">
          <Link href="/docs">Docs</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <span>HookKit · static-first backend</span>
        </footer>
      </main>
    </div>
  );
}
