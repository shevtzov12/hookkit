"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEMO_FORM_SLUG,
  DEMO_INBOX_SLUG,
  FORMS,
  INBOXES,
  SUBMISSIONS,
  WEBHOOK_EVENTS,
  getEmbedSnippets,
  getFormUrl,
  getInboxUrl,
  type DashboardView,
  type EmbedTab,
  type Submission,
  type WebhookEvent,
} from "@/lib/mock-data";
import { highlightJson } from "@/lib/json-highlight";
import { ClerkUserArea } from "@/components/dashboard/clerk-user-area";

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

export function DashboardApp({ clerkEnabled = false }: { clerkEnabled?: boolean }) {
  const [view, setView] = useState<DashboardView>("webhooks");
  const [activeInboxId, setActiveInboxId] = useState(INBOXES[0].id);
  const [selectedEventId, setSelectedEventId] = useState(WEBHOOK_EVENTS[0].id);
  const [activeFormId, setActiveFormId] = useState(FORMS[0].id);
  const [embedTab, setEmbedTab] = useState<EmbedTab>("html");
  const [baseUrl] = useState(
    () =>
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
  );
  const [liveEvents, setLiveEvents] = useState<WebhookEvent[]>([]);
  const [liveSubmissions, setLiveSubmissions] = useState<Submission[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveFormsLoading, setLiveFormsLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingFormTest, setSendingFormTest] = useState(false);
  const [apiKeys, setApiKeys] = useState<
    Array<{
      id: string;
      keyPrefix: string;
      label: string;
      environment: "live" | "test";
      revokedAt: string | null;
      lastUsedAt: string | null;
      createdAt: string;
      active: boolean;
    }>
  >([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  const activeInbox = INBOXES.find((i) => i.id === activeInboxId) ?? INBOXES[0];
  const activeForm = FORMS.find((f) => f.id === activeFormId) ?? FORMS[0];
  const isLiveInbox = activeInbox.url === DEMO_INBOX_SLUG;
  const isLiveForm = activeForm.endpoint === DEMO_FORM_SLUG;
  const formUrl = getFormUrl(activeForm.endpoint, baseUrl);
  const embedSnippets = getEmbedSnippets(formUrl);

  const refreshLiveEvents = useCallback(async (silent = false) => {
    if (!isLiveInbox) return;
    if (!silent) setLiveLoading(true);
    try {
      const res = await fetch(`/api/inboxes/${DEMO_INBOX_SLUG}/events`);
      if (!res.ok) return;
      const data = (await res.json()) as { events: WebhookEvent[] };
      setLiveEvents(data.events);
      if (data.events.length > 0) {
        setSelectedEventId(data.events[0].id);
      }
    } finally {
      if (!silent) setLiveLoading(false);
    }
  }, [isLiveInbox]);

  const refreshLiveSubmissions = useCallback(async (silent = false) => {
    if (!isLiveForm) return;
    if (!silent) setLiveFormsLoading(true);
    try {
      const res = await fetch(`/api/forms/${DEMO_FORM_SLUG}/submissions?includeSpam=1`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        submissions: Array<{
          email: string;
          message: string;
          source: string;
          spam: boolean;
          time: string;
        }>;
        pagination: { spamCount: number; total: number };
      };
      setLiveSubmissions(
        data.submissions.map((s) => ({
          time: s.time,
          email: s.email,
          message: s.message,
          source: s.source,
          spam: s.spam,
        })),
      );
    } finally {
      if (!silent) setLiveFormsLoading(false);
    }
  }, [isLiveForm]);

  const refreshApiKeys = useCallback(async () => {
    if (!clerkEnabled) return;
    setApiKeysLoading(true);
    setApiKeysError(null);
    try {
      const res = await fetch("/api/v1/api-keys");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setApiKeysError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as {
        keys: Array<{
          id: string;
          keyPrefix: string;
          label: string;
          environment: "live" | "test";
          revokedAt: string | null;
          lastUsedAt: string | null;
          createdAt: string;
          active: boolean;
        }>;
      };
      setApiKeys(data.keys.filter((k) => k.active));
    } finally {
      setApiKeysLoading(false);
    }
  }, [clerkEnabled]);

  useEffect(() => {
    if (!isLiveForm) return;
    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/forms/${DEMO_FORM_SLUG}/submissions?includeSpam=1`);
      if (cancelled || !res.ok) return;
      const data = (await res.json()) as {
        submissions: Array<{
          email: string;
          message: string;
          source: string;
          spam: boolean;
          time: string;
        }>;
      };
      setLiveSubmissions(
        data.submissions.map((s) => ({
          time: s.time,
          email: s.email,
          message: s.message,
          source: s.source,
          spam: s.spam,
        })),
      );
    }

    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isLiveForm]);

  const displayedSubmissions = isLiveForm ? liveSubmissions : SUBMISSIONS;
  const nonSpamCount = displayedSubmissions.filter((s) => !s.spam).length;
  const spamCount = displayedSubmissions.filter((s) => s.spam).length;

  useEffect(() => {
    if (!isLiveInbox) return;
    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/inboxes/${DEMO_INBOX_SLUG}/events`);
      if (cancelled || !res.ok) return;
      const data = (await res.json()) as { events: WebhookEvent[] };
      setLiveEvents(data.events);
      if (data.events.length > 0) {
        setSelectedEventId((prev) => prev ?? data.events[0].id);
      }
    }

    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isLiveInbox]);

  const displayedEvents = isLiveInbox ? liveEvents : WEBHOOK_EVENTS;
  const selectedEvent =
    displayedEvents.find((e) => e.id === selectedEventId) ?? displayedEvents[0];

  const inboxUrl = getInboxUrl(activeInbox.url, baseUrl);

  const jsonHtml = useMemo(
    () => (selectedEvent ? highlightJson(selectedEvent.payload) : ""),
    [selectedEvent],
  );

  async function copyInboxUrl() {
    await navigator.clipboard.writeText(inboxUrl);
  }

  async function sendTestWebhook() {
    setSendingTest(true);
    try {
      await fetch(inboxUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "test.ping",
          source: "dashboard",
          message: "Hello from HookKit dashboard",
          ts: Date.now(),
        }),
      });
      if (isLiveInbox) await refreshLiveEvents(true);
    } finally {
      setSendingTest(false);
    }
  }

  async function sendTestSubmission() {
    setSendingFormTest(true);
    try {
      await fetch(formUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "demo@hookkit.local",
          message: "Test submission from dashboard",
          source: "dashboard",
        }),
      });
      if (isLiveForm) await refreshLiveSubmissions(true);
    } finally {
      setSendingFormTest(false);
    }
  }

  async function createApiKey() {
    if (!clerkEnabled) return;
    setCreatingKey(true);
    setApiKeysError(null);
    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "dashboard", environment: "live" }),
      });
      const data = (await res.json()) as { secret?: string; error?: string };
      if (!res.ok) {
        setApiKeysError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      if (data.secret) setCreatedSecret(data.secret);
      await refreshApiKeys();
    } finally {
      setCreatingKey(false);
    }
  }

  async function revokeApiKey(id: string) {
    const res = await fetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setApiKeysError(data.error ?? `HTTP ${res.status}`);
      return;
    }
    await refreshApiKeys();
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
            onClick={() => {
              setView("apikeys");
              void refreshApiKeys();
            }}
          >
            <NavIcon name="key" />
            API Keys
          </button>
          <button type="button" className="nav-item">
            <NavIcon name="settings" />
            Settings
          </button>

          <div className="sidebar-footer">
            {clerkEnabled ? (
              <ClerkUserArea />
            ) : (
              <div className="user-chip">
                <div className="avatar">AK</div>
                <div>
                  <div className="user-name">Guest</div>
                  <div className="user-plan">Clerk not configured</div>
                </div>
              </div>
            )}
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
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void sendTestWebhook()}
                  disabled={sendingTest}
                >
                  {sendingTest ? "Sending…" : "Send test"}
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
                          <span>
                            {inbox.url === DEMO_INBOX_SLUG
                              ? `${liveEvents.length} events`
                              : `${inbox.events} events`}
                          </span>
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
                    <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      {displayedEvents.length} total
                      {isLiveInbox ? " · live" : ""}
                    </span>
                  </div>
                  <div className="panel-body flush">
                    {isLiveInbox && liveLoading && displayedEvents.length === 0 ? (
                      <div style={{ padding: 16, color: "var(--text-dim)", fontSize: 13 }}>
                        Loading live events…
                      </div>
                    ) : null}
                    {displayedEvents.length === 0 ? (
                      <div style={{ padding: 16, color: "var(--text-dim)", fontSize: 13 }}>
                        No events yet. Hit Send test or POST to the inbox URL.
                      </div>
                    ) : (
                      displayedEvents.map((ev) => (
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
                      ))
                    )}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">Payload</span>
                    <span className="pill pill-blue">{selectedEvent?.method ?? "—"}</span>
                  </div>
                  <div className="panel-body flush">
                    {selectedEvent ? (
                      <div
                        className="json-block"
                        dangerouslySetInnerHTML={{ __html: jsonHtml }}
                      />
                    ) : (
                      <div style={{ padding: 16, color: "var(--text-dim)", fontSize: 13 }}>
                        Select an event to view payload.
                      </div>
                    )}
                  </div>
                  <div className="detail-actions">
                    <button type="button" className="btn btn-primary" style={{ flex: 1 }}>
                      ↻ Replay to URL
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        if (selectedEvent) {
                          void navigator.clipboard.writeText(
                            JSON.stringify(selectedEvent.payload, null, 2),
                          );
                        }
                      }}
                    >
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
                <div className="topbar-sub">{activeForm.name}</div>
              </div>
              <div className="topbar-actions">
                <button type="button" className="btn btn-ghost">
                  Export CSV
                </button>
                <button type="button" className="btn">
                  + New Form
                </button>
                {isLiveForm ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void sendTestSubmission()}
                    disabled={sendingFormTest}
                  >
                    {sendingFormTest ? "Sending…" : "Send test"}
                  </button>
                ) : null}
              </div>
            </header>

            <div className="content">
              <div className="stats">
                <div className="stat-card">
                  <div className="stat-label">Submissions</div>
                  <div className="stat-value">{nonSpamCount}</div>
                  <div className="stat-delta">
                    {isLiveForm ? "live · non-spam" : "+12 this week"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Spam blocked</div>
                  <div className="stat-value">{spamCount}</div>
                  <div className="stat-delta neutral">honeypot _gotcha</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Active forms</div>
                  <div className="stat-value">{FORMS.length}</div>
                  <div className="stat-delta neutral">
                    {isLiveForm ? "1 live demo" : "1 landing, 1 waitlist"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Endpoint</div>
                  <div className="stat-value" style={{ fontSize: 13, marginTop: 4 }}>
                    /f/{activeForm.endpoint.slice(0, 12)}…
                  </div>
                  <div className="stat-delta neutral">{isLiveForm ? "live" : "mock"}</div>
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
                            <span>
                              {form.endpoint === DEMO_FORM_SLUG
                                ? `${liveSubmissions.filter((s) => !s.spam).length} submissions`
                                : `${form.subs} submissions`}
                            </span>
                            {form.id === "demo" ? (
                              <span className="pill pill-amber">guest</span>
                            ) : null}
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
                        <pre>{embedSnippets[embedTab]}</pre>
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
                    <span className="pill pill-amber">
                      {isLiveForm
                        ? `${nonSpamCount} shown`
                        : "3 new"}
                      {isLiveForm ? " · live" : ""}
                    </span>
                  </div>
                  <div className="panel-body flush">
                    {isLiveForm && liveFormsLoading && displayedSubmissions.length === 0 ? (
                      <div style={{ padding: 16, color: "var(--text-dim)", fontSize: 13 }}>
                        Loading submissions…
                      </div>
                    ) : null}
                    {displayedSubmissions.length === 0 ? (
                      <div style={{ padding: 16, color: "var(--text-dim)", fontSize: 13 }}>
                        No submissions yet. Hit Send test or POST to the form URL.
                      </div>
                    ) : (
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
                          {displayedSubmissions.map((s, i) => (
                            <tr
                              key={`${s.email}-${s.time}-${i}`}
                              className={i === 0 && !s.spam ? "selected" : ""}
                            >
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
                    )}
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
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!clerkEnabled || creatingKey}
                  onClick={() => void createApiKey()}
                >
                  {creatingKey ? "Creating…" : "+ Create key"}
                </button>
              </div>
            </header>

            <div className="content content--scroll">
              {!clerkEnabled ? (
                <div className="panel hookkit-panel-max">
                  <div className="panel-body">
                    <p style={{ color: "var(--text-dim)", margin: 0 }}>
                      Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
                      <code>CLERK_SECRET_KEY</code> in <code>.env.local</code> to manage API keys.
                    </p>
                  </div>
                </div>
              ) : null}

              {createdSecret ? (
                <div className="panel hookkit-panel-max" style={{ marginBottom: 16 }}>
                  <div className="panel-header">
                    <span className="panel-title">New key — copy now</span>
                  </div>
                  <div className="panel-body">
                    <code style={{ wordBreak: "break-all" }}>{createdSecret}</code>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ marginTop: 12 }}
                      onClick={() => setCreatedSecret(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}

              {apiKeysError ? (
                <p style={{ color: "var(--danger, #f87171)", marginBottom: 16 }}>{apiKeysError}</p>
              ) : null}

              <div className="panel hookkit-panel-max">
                <div className="panel-header">
                  <span className="panel-title">Your keys</span>
                </div>
                <div className="panel-body flush">
                  {apiKeysLoading ? (
                    <p style={{ padding: 16, color: "var(--text-dim)" }}>Loading…</p>
                  ) : apiKeys.length === 0 ? (
                    <p style={{ padding: 16, color: "var(--text-dim)" }}>No API keys yet.</p>
                  ) : (
                    apiKeys.map((key) => (
                      <div className="api-key-row" key={key.id}>
                        <span
                          className={`pill ${key.environment === "live" ? "pill-green" : "pill-amber"}`}
                        >
                          {key.environment}
                        </span>
                        <span className="key-prefix">{key.keyPrefix}</span>
                        <span className="key-meta">
                          {key.label} · Created {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsedAt
                            ? ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                            : ""}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => void revokeApiKey(key.id)}
                        >
                          Revoke
                        </button>
                      </div>
                    ))
                  )}
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
