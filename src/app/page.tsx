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
          sites — API-first, with keys and rate limits.
        </p>
        <div className="landing-actions">
          <Link href="/dashboard" className="landing-btn landing-btn-primary">
            Open dashboard
          </Link>
          <a href="#features" className="landing-btn landing-btn-ghost">
            Features
          </a>
        </div>
        <ul id="features" className="landing-features">
          <li>Webhook Inbox with replay</li>
          <li>Form backend for static landings</li>
          <li>API keys &amp; rate limits</li>
        </ul>
      </main>
    </div>
  );
}
