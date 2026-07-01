import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function DocsPage() {
  return (
    <div className="landing">
      <div className="landing-grid" aria-hidden />
      <main className="landing-main docs-main">
        <div className="landing-logo">
          <Link href="/" className="landing-name" style={{ textDecoration: "none" }}>
            ← HookKit
          </Link>
        </div>
        <h1 className="landing-title" style={{ fontSize: "2rem" }}>
          API Reference
        </h1>
        <p className="landing-lead">
          Public ingest endpoints, authenticated read APIs, and v1 management routes.
        </p>

        <section className="docs-section">
          <h2>Webhook Inbox</h2>
          <pre className="docs-code">{`POST ${BASE}/h/{inboxId}
Content-Type: application/json

{ "type": "order.created", "data": { ... } }`}</pre>
          <p className="docs-note">Methods: POST, PUT, PATCH · Max body 256 KB · Rate limit 100/day per inbox+IP</p>
        </section>

        <section className="docs-section">
          <h2>Form Backend</h2>
          <pre className="docs-code">{`POST ${BASE}/f/{formId}
Content-Type: application/json

{
  "email": "user@example.com",
  "message": "Hello",
  "_gotcha": ""
}`}</pre>
          <p className="docs-note">
            Honeypot field <code>_gotcha</code> · Optional Turnstile <code>cf-turnstile-response</code> ·
            Rate limit 500/month per form+IP
          </p>
        </section>

        <section className="docs-section">
          <h2>Read APIs</h2>
          <ul className="landing-features docs-list">
            <li><code>GET /api/inboxes/&#123;id&#125;/events</code> — list webhook events</li>
            <li><code>GET /api/forms/&#123;id&#125;/submissions</code> — list submissions</li>
            <li><code>GET /api/forms/&#123;id&#125;/submissions/export</code> — CSV download</li>
            <li><code>POST /api/inboxes/&#123;id&#125;/events/&#123;eventId&#125;/replay</code> — replay event</li>
          </ul>
          <p className="docs-note">
            Guest demo IDs (<code>wh_demo_guest</code>, <code>frm_demo_guest</code>) are public.
            Other resources require Clerk session or Bearer API key.
          </p>
        </section>

        <section className="docs-section">
          <h2>Auth (v1)</h2>
          <pre className="docs-code">{`Authorization: Bearer sk_live_...

GET  /api/v1/forms
GET  /api/v1/api-keys
POST /api/v1/inboxes`}</pre>
        </section>

        <div className="landing-actions">
          <Link href="/dashboard" className="landing-btn landing-btn-primary">
            Open dashboard
          </Link>
          <Link href="/" className="landing-btn landing-btn-ghost">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
