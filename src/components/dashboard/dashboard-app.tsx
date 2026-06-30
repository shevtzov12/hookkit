"use client";

import { useMemo, useState } from "react";
import {
  EMBED_SNIPPETS,
  FORMS,
  INBOXES,
  SUBMISSIONS,
  WEBHOOK_EVENTS,
  getInboxUrl,
  type DashboardView,
  type EmbedTab,
} from "@/lib/mock-data";
import { highlightJson } from "@/lib/json-highlight";

function NavIcon({ name }: { name: "webhook" | "form" | "key" | "settings" }) {
  if (name === "webhook") {
    return (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 8h8M8 4v8" />
        <circle cx="8" cy="8" r="6" />
      </svg>
    );
  }
  if (name === "form") {
    return (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="12" height="10" rx="1" />
        <path d="M5 7h6M5 10h4" />
      </svg>
    );
  }
  if (name === "key") {
    return (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 2H6a2 2 0 00-2 2v1H3a1 1 0 000 2h1v1a2 2 0 002 2h4a2 2 0 002-2V7h1a1 1 0 000-2h-1V4a2 2 0 00-2-2z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2" />
    </svg>
  );
}

export function DashboardApp() {
  const [view, setView] = useState<DashboardView>("webhooks");
  const [activeInboxId, setActiveInboxId] = useState(INBOXES[0].id);
  const [selectedEventId, setSelectedEventId] = useState(WEBHOOK_EVENTS[0].id);
  const [activeFormId, setActiveFormId] = useState(FORMS[0].id);
  const [embedTab, setEmbedTab] = useState<EmbedTab>("html");

  const activeInbox = INBOXES.find((i) => i.id === activeInboxId) ?? INBOXES[0];
  const selectedEvent =
    WEBHOOK_EVENTS.find((e) => e.id === selectedEventId) ?? WEBHOOK_EVENTS[0];
  const inboxUrl = getInboxUrl(activeInbox.url);

  const jsonHtml = useMemo(
    () => highlightJson(selectedEvent.payload),
    [selectedEvent.payload],
  );

  async function copyInboxUrl() {
    await navigator.clipboard.writeText(inboxUrl);
  }

  return (
    <div className="hookkit-root">
      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-mark">HK</div>
            <span className="logo-text">HookKit</span>
            <span className="logo-badge">beta</span>
          </div>

          <div className="nav-label">Product</div>
          <button
            type="button"
            className={`nav-item${view === "webhooks" ? " active" : ""}`}
            onClick={() => setView("webhooks")}
          >
            <NavIcon name="webhook" />
            Webhook Inbox
            <span className="nav-count">3</span>
          </button>
          <button
            type="button"
            className={`nav-item${view === "forms" ? " active" : ""}`}
            onClick={() => setView("forms")}
          >
            <NavIcon name="form" />
            Form Backend
            <span className="nav-count">2</span>
          </button>

          <div className="nav-label">Account</div>
          <button
            type="button"
            className={`nav-item${view === "apikeys" ? " active" : ""}`}
            onClick={() => setView("apikeys")}
          >
            <NavIcon name="key" />
            API Keys
          </button>
          <button type="button" className="nav-item">
            <NavIcon name="settings" />
            Settings
          </button>

          <div className="sidebar-footer">
            <div className="user-chip">
              <div className="avatar">AK</div>
              <div>
                <div className="user-name">Alexey</div>
                <div className="user-plan">Free · 47/100 req today</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className={`view${view === "webhooks" ? " active" : ""}`}>
            <header className="topbar">
              <div>
                <div className="topbar-title">Webhook Inbox</div>
                <div className="topbar-sub">{activeInbox.name}</div>
              </div>
              <div className="topbar-actions">
                <button type="button" className="btn btn-ghost">
                  Docs
                </button>
                <button type="button" className="btn">
                  + New Inbox
                </button>
                <button type="button" className="btn btn-primary">
                  Send test
                </button>
              </div>
            </header>

            <div className="content">
              <div className="stats">
                <div className="stat-card">
                  <div className="stat-label">Events today</div>
                  <div className="stat-value">24</div>
                  <div className="stat-delta">+6 vs yesterday</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Last event</div>
                  <div className="stat-value" style={{ fontSize: 15, marginTop: 4 }}>
                    2 min ago
                  </div>
                  <div className="stat-delta neutral">checkout.session.completed</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Replays</div>
                  <div className="stat-value">3</div>
                  <div className="stat-delta neutral">this week</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Success rate</div>
                  <div className="stat-value">100%</div>
                  <div className="stat-delta">all 200 OK</div>
                </div>
              </div>

              <div className="copy-field">
                <code>{inboxUrl}</code>
                <button type="button" className="copy-btn" onClick={copyInboxUrl}>
                  Copy
                </button>
              </div>

              <div className="split">
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">Inboxes</span>
                    <span className="pill pill-green">live</span>
                  </div>
                  <div className="panel-body">
                    {INBOXES.map((inbox) => (
                      <div
                        key={inbox.id}
                        className={`inbox-item${inbox.id === activeInboxId ? " active" : ""}`}
                        onClick={() => setActiveInboxId(inbox.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setActiveInboxId(inbox.id);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="inbox-name">{inbox.name}</div>
                        <div className="inbox-url">hookkit.app/h/{inbox.url}</div>
                        <div className="inbox-meta">
                          <span>{inbox.events} events</span>
                          {inbox.id === "demo" ? (
                            <span className="pill pill-amber">guest</span>
                          ) : (
                            <span className="pill pill-green">active</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">Events</span>
                    <span style={{ fontSize: 12, color: "var(--text-dim)" }}>24 total</span>
                  </div>
                  <div className="panel-body flush">
                    {WEBHOOK_EVENTS.map((ev) => (
                      <div
                        key={ev.id}
                        className={`event-row${ev.id === selectedEventId ? " selected" : ""}`}
                        onClick={() => setSelectedEventId(ev.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setSelectedEventId(ev.id);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <span className="event-method">{ev.method}</span>
                        <span className="event-type">{ev.type}</span>
                        <span className="event-time">{ev.time}</span>
                        <span className="event-status ok">{ev.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">Payload</span>
                    <span className="pill pill-blue">{selectedEvent.method}</span>
                  </div>
                  <div className="panel-body flush">
                    <div
                      className="json-block"
                      dangerouslySetInnerHTML={{ __html: jsonHtml }}
                    />
                  </div>
                  <div className="detail-actions">
                    <button type="button" className="btn btn-primary" style={{ flex: 1 }}>
                      ↻ Replay to URL
                    </button>
                    <button type="button" className="btn">
                      Copy JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`view${view === "forms" ? " active" : ""}`}>
            <header className="topbar">
              <div>
                <div className="topbar-title">Form Backend</div>
                <div className="topbar-sub">Landing Contact Form</div>
              </div>
              <div className="topbar-actions">
                <button type="button" className="btn btn-ghost">
                  Export CSV
                </button>
                <button type="button" className="btn">
                  + New Form
                </button>
              </div>
            </header>

            <div className="content">
              <div className="stats">
                <div className="stat-card">
                  <div className="stat-label">Submissions</div>
                  <div className="stat-value">156</div>
                  <div className="stat-delta">+12 this week</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Spam blocked</div>
                  <div className="stat-value">23</div>
                  <div className="stat-delta neutral">honeypot + Turnstile</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Active forms</div>
                  <div className="stat-value">2</div>
                  <div className="stat-delta neutral">1 landing, 1 waitlist</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Webhooks fired</div>
                  <div className="stat-value">89</div>
                  <div className="stat-delta neutral">to Stripe Inbox</div>
                </div>
              </div>

              <div className="split-2">
                <div className="forms-sidebar">
                  <div className="panel panel-forms">
                    <div className="panel-header">
                      <span className="panel-title">Forms</span>
                    </div>
                    <div className="panel-body">
                      {FORMS.map((form) => (
                        <div
                          key={form.id}
                          className={`form-card${form.id === activeFormId ? " active" : ""}`}
                          onClick={() => setActiveFormId(form.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setActiveFormId(form.id);
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="form-card-name">{form.name}</div>
                          <div className="form-card-endpoint">
                            hookkit.app/f/{form.endpoint}
                          </div>
                          <div className="inbox-meta" style={{ marginTop: 8 }}>
                            <span>{form.subs} submissions</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel panel-embed">
                    <div className="panel-header">
                      <span className="panel-title">Embed</span>
                    </div>
                    <div className="panel-scroll">
                      <div className="tabs-inline">
                        {(["html", "fetch", "curl"] as EmbedTab[]).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            className={`tab-chip${embedTab === tab ? " active" : ""}`}
                            onClick={() => setEmbedTab(tab)}
                          >
                            {tab === "html" ? "HTML" : tab === "fetch" ? "fetch()" : "cURL"}
                          </button>
                        ))}
                      </div>
                      <div className="code-preview">
                        <pre>{EMBED_SNIPPETS[embedTab]}</pre>
                      </div>
                      <div className="settings-grid">
                        <div className="setting-row">
                          <span className="setting-label">Email notify</span>
                          <div className="toggle" />
                        </div>
                        <div className="setting-row">
                          <span className="setting-label">Webhook on submit</span>
                          <div className="toggle" />
                        </div>
                        <div className="setting-row">
                          <span className="setting-label">Turnstile spam</span>
                          <div className="toggle" />
                        </div>
                        <div className="setting-row">
                          <span className="setting-label">Redirect after submit</span>
                          <span
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: 11,
                              color: "var(--accent)",
                            }}
                          >
                            /thank-you
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">Submissions</span>
                    <span className="pill pill-amber">3 new</span>
                  </div>
                  <div className="panel-body flush">
                    <table className="submissions-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Email</th>
                          <th>Message</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SUBMISSIONS.map((s, i) => (
                          <tr key={`${s.email}-${s.time}`} className={i === 0 ? "selected" : ""}>
                            <td
                              style={{
                                fontFamily: "var(--mono)",
                                fontSize: 11,
                                color: "var(--text-dim)",
                              }}
                            >
                              {s.time}
                            </td>
                            <td className="email-cell">
                              {s.email}{" "}
                              {s.spam ? <span className="spam-badge">spam</span> : null}
                            </td>
                            <td className="msg-cell">{s.message}</td>
                            <td style={{ fontSize: 12, color: "var(--text-dim)" }}>
                              {s.source}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`view${view === "apikeys" ? " active" : ""}`}>
            <header className="topbar">
              <div>
                <div className="topbar-title">API Keys</div>
                <div className="topbar-sub">Authenticate API requests</div>
              </div>
              <div className="topbar-actions">
                <button type="button" className="btn btn-primary">
                  + Create key
                </button>
              </div>
            </header>

            <div className="content content--scroll">
              <div className="panel hookkit-panel-max">
                <div className="panel-header">
                  <span className="panel-title">Your keys</span>
                </div>
                <div className="panel-body flush">
                  <div className="api-key-row">
                    <span className="pill pill-green">live</span>
                    <span className="key-prefix">sk_live_••••••••x7k2</span>
                    <span className="key-meta">
                      Created Mar 12 · Last used 2 min ago · 47 req today
                    </span>
                    <button type="button" className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
                      Revoke
                    </button>
                  </div>
                  <div className="api-key-row">
                    <span className="pill pill-amber">test</span>
                    <span className="key-prefix">sk_test_••••••••m9p1</span>
                    <span className="key-meta">
                      Created Mar 10 · Last used yesterday · 12 req total
                    </span>
                    <button type="button" className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
                      Revoke
                    </button>
                  </div>
                </div>
              </div>

              <div className="panel hookkit-panel-max">
                <div className="panel-header">
                  <span className="panel-title">Rate limits (Free)</span>
                </div>
                <div className="settings-grid">
                  <div className="setting-row">
                    <span className="setting-label">Webhook events / day</span>
                    <span style={{ fontFamily: "var(--mono)" }}>100</span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Form submissions / month</span>
                    <span style={{ fontFamily: "var(--mono)" }}>500</span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Max inboxes</span>
                    <span style={{ fontFamily: "var(--mono)" }}>3</span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Max forms</span>
                    <span style={{ fontFamily: "var(--mono)" }}>2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
