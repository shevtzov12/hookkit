"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEMO_FORM_SLUG,
  DEMO_INBOX_SLUG,
  getEmbedSnippets,
  getFormUrl,
  getInboxUrl,
  type DashboardView,
  type EmbedTab,
  type FormItem,
  type Inbox,
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

const DEFAULT_INBOXES: Inbox[] = [
  {
    id: DEMO_INBOX_SLUG,
    name: "Demo (read-only)",
    url: DEMO_INBOX_SLUG,
    events: 0,
    active: true,
  },
];

const DEFAULT_FORMS: FormItem[] = [
  {
    id: DEMO_FORM_SLUG,
    name: "Demo (live)",
    endpoint: DEMO_FORM_SLUG,
    subs: 0,
    active: true,
  },
];

export function DashboardApp({
  clerkEnabled = false,
  apiKeysEnabled = false,
}: {
  clerkEnabled?: boolean;
  apiKeysEnabled?: boolean;
}) {
  const [view, setView] = useState<DashboardView>("webhooks");
  const [inboxList, setInboxList] = useState<Inbox[]>(() =>
    clerkEnabled ? [] : DEFAULT_INBOXES,
  );
  const [formList, setFormList] = useState<FormItem[]>(() =>
    clerkEnabled ? [] : DEFAULT_FORMS,
  );
  const [activeInboxId, setActiveInboxId] = useState(() =>
    clerkEnabled ? "" : DEMO_INBOX_SLUG,
  );
  const [selectedEventRecordId, setSelectedEventRecordId] = useState<string | null>(null);
  const [activeFormId, setActiveFormId] = useState(() => (clerkEnabled ? "" : DEMO_FORM_SLUG));
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
  const [replayUrl, setReplayUrl] = useState("");
  const [replayStats, setReplayStats] = useState({ replaysThisWeek: 0, successRate: 100 });
  const [replaying, setReplaying] = useState(false);
  const [replayMessage, setReplayMessage] = useState<string | null>(null);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [emailNotifyEnabled, setEmailNotifyEnabled] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [webhookOnSubmitEnabled, setWebhookOnSubmitEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [formRedirectUrl, setFormRedirectUrl] = useState("/thank-you");
  const [actionError, setActionError] = useState<string | null>(null);
  const [creatingInbox, setCreatingInbox] = useState(false);
  const [creatingForm, setCreatingForm] = useState(false);
  const [statusInfo, setStatusInfo] = useState<{
    storage: string;
    clerk: boolean;
    upstash: boolean;
    resend: boolean;
    turnstile: boolean;
    appUrl: string;
  } | null>(null);
  const [inboxStats, setInboxStats] = useState({
    today: 0,
    lastEventType: null as string | null,
    lastEventTime: null as string | null,
  });
  const [rateLimits, setRateLimits] = useState({
    webhook: { limit: 100, used: 0, remaining: 100, enabled: false },
    form: { limit: 500, used: 0, remaining: 500, enabled: false },
  });
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

  const activeInbox =
    inboxList.find((i) => i.id === activeInboxId) ??
    inboxList[0] ??
    (clerkEnabled ? undefined : DEFAULT_INBOXES[0]);
  const activeForm =
    formList.find((f) => f.id === activeFormId) ??
    formList[0] ??
    (clerkEnabled ? undefined : DEFAULT_FORMS[0]);
  const activeInboxSlug = activeInbox?.url ?? "";
  const activeFormSlug = activeForm?.endpoint ?? "";
  const formUrl = getFormUrl(activeFormSlug, baseUrl);
  const embedSnippets = getEmbedSnippets(
    formUrl,
    turnstileEnabled ? turnstileSiteKey : null,
  );

  const refreshLiveEvents = useCallback(
    async (silent = false, selectRecordId?: string) => {
      if (!silent) setLiveLoading(true);
      try {
        const res = await fetch(`/api/inboxes/${activeInboxSlug}/events`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { events: WebhookEvent[] };
        setLiveEvents(data.events);
        if (selectRecordId) {
          setSelectedEventRecordId(selectRecordId);
        } else if (data.events.length > 0) {
          setSelectedEventRecordId((prev) => {
            if (prev && data.events.some((e) => e.recordId === prev)) return prev;
            return data.events[0].recordId ?? null;
          });
        } else {
          setSelectedEventRecordId(null);
        }
      } finally {
        if (!silent) setLiveLoading(false);
      }
    },
    [activeInboxSlug],
  );

  const refreshInboxStats = useCallback(async () => {
    const res = await fetch(`/api/inboxes/${activeInboxSlug}/stats`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      today?: number;
      lastEvent?: { type: string; time: string } | null;
      rateLimit?: { limit: number; used: number; remaining: number; enabled: boolean };
    };
    setInboxStats({
      today: data.today ?? 0,
      lastEventType: data.lastEvent?.type ?? null,
      lastEventTime: data.lastEvent?.time ?? null,
    });
    if (data.rateLimit) {
      setRateLimits((prev) => ({
        ...prev,
        webhook: {
          limit: data.rateLimit!.limit,
          used: data.rateLimit!.used,
          remaining: data.rateLimit!.remaining,
          enabled: data.rateLimit!.enabled,
        },
      }));
    }
  }, [activeInboxSlug]);

  const refreshRateLimits = useCallback(async () => {
    const [inboxRes, formRes] = await Promise.all([
      fetch(`/api/inboxes/${activeInboxSlug}/stats`),
      fetch(`/api/forms/${activeFormSlug}/usage`),
    ]);

    if (inboxRes.ok) {
      const data = (await inboxRes.json()) as {
        rateLimit?: { limit: number; used: number; remaining: number; enabled: boolean };
      };
      if (data.rateLimit) {
        setRateLimits((prev) => ({
          ...prev,
          webhook: {
            limit: data.rateLimit!.limit,
            used: data.rateLimit!.used,
            remaining: data.rateLimit!.remaining,
            enabled: data.rateLimit!.enabled,
          },
        }));
      }
    }

    if (formRes.ok) {
      const data = (await formRes.json()) as {
        rateLimit?: { limit: number; used: number; remaining: number; enabled: boolean };
      };
      if (data.rateLimit) {
        setRateLimits((prev) => ({
          ...prev,
          form: {
            limit: data.rateLimit!.limit,
            used: data.rateLimit!.used,
            remaining: data.rateLimit!.remaining,
            enabled: data.rateLimit!.enabled,
          },
        }));
      }
    }
  }, [activeInboxSlug, activeFormSlug]);

  const refreshLiveSubmissions = useCallback(async (silent = false) => {
    if (!silent) setLiveFormsLoading(true);
    try {
      const res = await fetch(`/api/forms/${activeFormSlug}/submissions?includeSpam=1`);
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
  }, [activeFormSlug]);

  const refreshApiKeys = useCallback(async () => {
    if (!apiKeysEnabled) return;
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
  }, [apiKeysEnabled]);

  const refreshInboxList = useCallback(async () => {
    const res = await fetch("/api/v1/inboxes");
    if (!res.ok) return;
    const data = (await res.json()) as {
      inboxes: Array<{ id: string; publicId: string; name: string; isGuest: boolean }>;
    };
    const mapped = data.inboxes.map((row) => ({
      id: row.publicId,
      name: row.name,
      url: row.publicId,
      events: 0,
      active: !row.isGuest,
    }));
    if (clerkEnabled) {
      setInboxList(mapped);
      setActiveInboxId((prev) =>
        prev && mapped.some((inbox) => inbox.id === prev) ? prev : (mapped[0]?.id ?? ""),
      );
      return;
    }
    setInboxList(mapped.length > 0 ? mapped : DEFAULT_INBOXES);
    if (mapped.length > 0) {
      setActiveInboxId((prev) =>
        mapped.some((inbox) => inbox.id === prev) ? prev : mapped[0].id,
      );
    }
  }, [clerkEnabled]);

  const refreshFormList = useCallback(async () => {
    const res = await fetch("/api/v1/forms");
    if (!res.ok) return;
    const data = (await res.json()) as {
      forms: Array<{ id: string; publicId: string; name: string; isGuest: boolean }>;
    };
    const mapped = data.forms.map((row) => ({
      id: row.publicId,
      name: row.name,
      endpoint: row.publicId,
      subs: 0,
      active: !row.isGuest,
    }));
    if (clerkEnabled) {
      setFormList(mapped);
      setActiveFormId((prev) =>
        prev && mapped.some((form) => form.id === prev) ? prev : (mapped[0]?.id ?? ""),
      );
      return;
    }
    setFormList(mapped.length > 0 ? mapped : DEFAULT_FORMS);
    if (mapped.length > 0) {
      setActiveFormId((prev) =>
        mapped.some((form) => form.id === prev) ? prev : mapped[0].id,
      );
    }
  }, [clerkEnabled]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await refreshInboxList();
      if (cancelled) return;
      await refreshFormList();
      if (cancelled) return;
      try {
        const res = await fetch("/api/dashboard/status");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setStatusInfo(data);
      } catch {
        // ignore
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [refreshInboxList, refreshFormList]);

  useEffect(() => {
    if (!activeFormSlug) {
      setLiveSubmissions([]);
      return;
    }

    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      await refreshLiveSubmissions(true);
    }

    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeFormSlug, refreshLiveSubmissions]);

  const displayedSubmissions = liveSubmissions;
  const nonSpamCount = displayedSubmissions.filter((s) => !s.spam).length;
  const spamCount = displayedSubmissions.filter((s) => s.spam).length;

  useEffect(() => {
    if (!activeInboxSlug) {
      setLiveEvents([]);
      setSelectedEventRecordId(null);
      return;
    }

    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/inboxes/${activeInboxSlug}/events`, {
        cache: "no-store",
      });
      if (cancelled || !res.ok) return;
      const data = (await res.json()) as { events: WebhookEvent[] };
      setLiveEvents(data.events);
      setSelectedEventRecordId((prev) => {
        if (prev && data.events.some((e) => e.recordId === prev)) return prev;
        return data.events[0]?.recordId ?? null;
      });
    }

    void poll();
    const timer = window.setInterval(() => void poll(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeInboxSlug]);

  useEffect(() => {
    if (!activeInboxSlug) {
      setReplayUrl("");
      setReplayStats({ replaysThisWeek: 0, successRate: 100 });
      return;
    }

    let cancelled = false;

    async function loadReplayMeta() {
      const res = await fetch(`/api/inboxes/${activeInboxSlug}/replay`);
      if (cancelled || !res.ok) return;
      const data = (await res.json()) as {
        replayUrl?: string | null;
        replaysThisWeek?: number;
        successRate?: number;
      };
      setReplayUrl(data.replayUrl ?? "");
      setReplayStats({
        replaysThisWeek: data.replaysThisWeek ?? 0,
        successRate: data.successRate ?? 100,
      });
    }

    void loadReplayMeta();
    return () => {
      cancelled = true;
    };
  }, [activeInboxSlug]);

  useEffect(() => {
    if (!activeFormSlug) return;

    let cancelled = false;

    async function loadFormSettings() {
      const res = await fetch(`/api/forms/${activeFormSlug}/settings`);
      if (cancelled || !res.ok) return;
      const data = (await res.json()) as {
        settings?: {
          turnstileEnabled?: boolean;
          redirectUrl?: string;
          emailNotify?: boolean;
          notifyEmail?: string;
          webhookOnSubmit?: boolean;
          webhookUrl?: string;
        };
      };
      setTurnstileEnabled(Boolean(data.settings?.turnstileEnabled));
      setEmailNotifyEnabled(Boolean(data.settings?.emailNotify));
      setNotifyEmail(data.settings?.notifyEmail ?? "");
      setWebhookOnSubmitEnabled(Boolean(data.settings?.webhookOnSubmit));
      setWebhookUrl(data.settings?.webhookUrl ?? "");
      setFormRedirectUrl(data.settings?.redirectUrl ?? "/thank-you");
    }

    void loadFormSettings();
    return () => {
      cancelled = true;
    };
  }, [activeFormSlug]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      if (cancelled) return;
      await refreshInboxStats();
    }

    void loadStats();
    const timer = window.setInterval(() => void loadStats(), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeInboxSlug, refreshInboxStats]);

  useEffect(() => {
    if (view !== "apikeys") return;
    let cancelled = false;

    async function loadLimits() {
      if (cancelled) return;
      await refreshRateLimits();
    }

    void loadLimits();
    return () => {
      cancelled = true;
    };
  }, [view, refreshRateLimits, activeInboxSlug, activeFormSlug]);

  const displayedEvents = liveEvents;
  const selectedEvent =
    displayedEvents.find((e) => e.recordId === selectedEventRecordId) ??
    displayedEvents[0] ??
    null;

  const inboxUrl = activeInbox ? getInboxUrl(activeInbox.url, baseUrl) : "";

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
      const res = await fetch(inboxUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "test.ping",
          source: "dashboard",
          message: "Hello from HookKit dashboard",
          ts: Date.now(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { eventId?: string };
      await refreshLiveEvents(true, data.eventId);
      await refreshInboxStats();
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
      await refreshLiveSubmissions(true);
    } finally {
      setSendingFormTest(false);
    }
  }

  async function createInbox() {
    const name = window.prompt("Inbox name");
    if (!name?.trim()) return;
    setCreatingInbox(true);
    setActionError(null);
    try {
      const res = await fetch("/api/v1/inboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as {
        inbox?: { publicId: string };
        error?: string;
      };
      if (!res.ok) {
        setActionError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      await refreshInboxList();
      if (data.inbox?.publicId) setActiveInboxId(data.inbox.publicId);
    } finally {
      setCreatingInbox(false);
    }
  }

  async function createForm() {
    const name = window.prompt("Form name");
    if (!name?.trim()) return;
    setCreatingForm(true);
    setActionError(null);
    try {
      const res = await fetch("/api/v1/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as {
        form?: { publicId: string };
        error?: string;
      };
      if (!res.ok) {
        setActionError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      await refreshFormList();
      if (data.form?.publicId) setActiveFormId(data.form.publicId);
    } finally {
      setCreatingForm(false);
    }
  }

  async function createApiKey() {
    if (!apiKeysEnabled) return;
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

  async function saveReplayUrl() {
    await fetch(`/api/inboxes/${activeInboxSlug}/replay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replayUrl: replayUrl.trim() || null }),
    });
  }

  async function replaySelectedEvent() {
    if (!selectedEvent?.recordId) return;
    setReplaying(true);
    setReplayMessage(null);
    try {
      await saveReplayUrl();
      const res = await fetch(
        `/api/inboxes/${activeInboxSlug}/events/${selectedEvent.recordId}/replay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(replayUrl.trim() ? { url: replayUrl.trim() } : {}),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        statusCode?: number | null;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        setReplayMessage(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setReplayMessage(
        data.statusCode != null
          ? data.ok
            ? `Replayed → HTTP ${data.statusCode}`
            : `Replay failed → HTTP ${data.statusCode}`
          : data.error ?? "Replay failed",
      );
      const meta = await fetch(`/api/inboxes/${activeInboxSlug}/replay`);
      if (meta.ok) {
        const summary = (await meta.json()) as {
          replaysThisWeek?: number;
          successRate?: number;
        };
        setReplayStats({
          replaysThisWeek: summary.replaysThisWeek ?? 0,
          successRate: summary.successRate ?? 100,
        });
      }
    } finally {
      setReplaying(false);
    }
  }

  async function saveFormSettings(patch: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/forms/${activeFormSlug}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(data.error ?? `Settings save failed (HTTP ${res.status})`);
      return false;
    }
    return true;
  }

  async function toggleTurnstile() {
    const next = !turnstileEnabled;
    setTurnstileEnabled(next);
    const ok = await saveFormSettings({ turnstileEnabled: next });
    if (!ok) setTurnstileEnabled(!next);
  }

  async function toggleEmailNotify() {
    const next = !emailNotifyEnabled;
    setEmailNotifyEnabled(next);
    const ok = await saveFormSettings({
      emailNotify: next,
      notifyEmail: notifyEmail.trim() || undefined,
    });
    if (!ok) setEmailNotifyEnabled(!next);
  }

  async function toggleWebhookOnSubmit() {
    const next = !webhookOnSubmitEnabled;
    setWebhookOnSubmitEnabled(next);
    const ok = await saveFormSettings({
      webhookOnSubmit: next,
      webhookUrl: webhookUrl.trim() || undefined,
    });
    if (!ok) setWebhookOnSubmitEnabled(!next);
  }

  async function exportSubmissionsCsv() {
    const res = await fetch(
      `/api/forms/${activeFormSlug}/submissions/export?includeSpam=1`,
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hookkit-${activeFormSlug}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
            <span className="nav-count">{inboxList.length}</span>
          </button>
          <button
            type="button"
            className={`nav-item${view === "forms" ? " active" : ""}`}
            onClick={() => setView("forms")}
          >
            <NavIcon name="form" />
            Form Backend
            <span className="nav-count">{formList.length}</span>
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
          <button
            type="button"
            className={`nav-item${view === "settings" ? " active" : ""}`}
            onClick={() => setView("settings")}
          >
            <NavIcon name="settings" />
            Settings
          </button>

          <div className="sidebar-footer">
            {clerkEnabled ? (
              <ClerkUserArea />
            ) : (
              <button
                type="button"
                className="user-chip"
                onClick={() => setView("settings")}
              >
                <div className="avatar">G</div>
                <div>
                  <div className="user-name">Guest</div>
                  <div className="user-plan">Local · file store</div>
                </div>
              </button>
            )}
          </div>
        </aside>

        <main className="main">
          {actionError ? (
            <div
              style={{
                margin: "12px 24px 0",
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(248,113,113,0.12)",
                color: "var(--danger, #f87171)",
                fontSize: 13,
              }}
            >
              {actionError}
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginLeft: 12, padding: "2px 8px", fontSize: 12 }}
                onClick={() => setActionError(null)}
              >
                Dismiss
              </button>
            </div>
          ) : null}

          <div className={`view${view === "webhooks" ? " active" : ""}`}>
            <header className="topbar">
              <div>
                <div className="topbar-title">Webhook Inbox</div>
                <div className="topbar-sub">{activeInbox?.name ?? "Create an inbox to get started"}</div>
              </div>
              <div className="topbar-actions">
                <Link href="/docs" className="btn btn-ghost">
                  Docs
                </Link>
                <button
                  type="button"
                  className="btn"
                  disabled={creatingInbox}
                  onClick={() => void createInbox()}
                >
                  {creatingInbox ? "Creating…" : "+ New Inbox"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void sendTestWebhook()}
                  disabled={sendingTest || !activeInbox}
                >
                  {sendingTest ? "Sending…" : "Send test"}
                </button>
              </div>
            </header>

            <div className="content">
              <div className="stats">
                <div className="stat-card">
                  <div className="stat-label">Events today</div>
                  <div className="stat-value">{inboxStats.today}</div>
                  <div className="stat-delta">{liveEvents.length} total · live</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Last event</div>
                  <div className="stat-value" style={{ fontSize: 15, marginTop: 4 }}>
                    {inboxStats.lastEventTime ?? "—"}
                  </div>
                  <div className="stat-delta neutral">
                    {inboxStats.lastEventType ?? "no events yet"}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Replays</div>
                  <div className="stat-value">{replayStats.replaysThisWeek}</div>
                  <div className="stat-delta neutral">this week</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Success rate</div>
                  <div className="stat-value">{replayStats.successRate}%</div>
                  <div className="stat-delta">replay targets</div>
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
                    {inboxList.map((inbox) => (
                      <div
                        key={inbox.id}
                        className={`inbox-item${inbox.id === activeInboxId ? " active" : ""}`}
                        onClick={() => {
                          setActiveInboxId(inbox.id);
                          setSelectedEventRecordId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setActiveInboxId(inbox.id);
                            setSelectedEventRecordId(null);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="inbox-name">{inbox.name}</div>
                        <div className="inbox-url">hookkit.app/h/{inbox.url}</div>
                        <div className="inbox-meta">
                          <span>
                            {inbox.id === DEMO_INBOX_SLUG
                              ? `${liveEvents.length} events`
                              : `${inbox.events} events`}
                          </span>
                          {inbox.id === DEMO_INBOX_SLUG ? (
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
                      {displayedEvents.length} total · live
                    </span>
                  </div>
                  <div className="panel-body flush">
                    {liveLoading && displayedEvents.length === 0 ? (
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
                          key={ev.recordId ?? ev.id}
                          className={`event-row${ev.recordId === selectedEventRecordId ? " selected" : ""}`}
                          onClick={() => setSelectedEventRecordId(ev.recordId ?? null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setSelectedEventRecordId(ev.recordId ?? null);
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
                  <div className="detail-actions" style={{ flexDirection: "column", gap: 8 }}>
                    <input
                      type="url"
                      className="btn"
                      style={{ width: "100%", fontFamily: "var(--mono)", fontSize: 12 }}
                      placeholder="https://your-api.example/webhook"
                      value={replayUrl}
                      onChange={(e) => setReplayUrl(e.target.value)}
                      onBlur={() => void saveReplayUrl()}
                    />
                    <div style={{ display: "flex", gap: 8, width: "100%" }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        disabled={!selectedEvent?.recordId || replaying}
                        onClick={() => void replaySelectedEvent()}
                      >
                        {replaying ? "Replaying…" : "↻ Replay to URL"}
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
                    {replayMessage ? (
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{replayMessage}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`view${view === "forms" ? " active" : ""}`}>
            <header className="topbar">
              <div>
                <div className="topbar-title">Form Backend</div>
                <div className="topbar-sub">{activeForm?.name ?? "Create a form to get started"}</div>
              </div>
              <div className="topbar-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void exportSubmissionsCsv()}
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={creatingForm}
                  onClick={() => void createForm()}
                >
                  {creatingForm ? "Creating…" : "+ New Form"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void sendTestSubmission()}
                  disabled={sendingFormTest}
                >
                  {sendingFormTest ? "Sending…" : "Send test"}
                </button>
              </div>
            </header>

            <div className="content">
              <div className="stats">
                <div className="stat-card">
                  <div className="stat-label">Submissions</div>
                  <div className="stat-value">{nonSpamCount}</div>
                  <div className="stat-delta">live · non-spam</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Spam blocked</div>
                  <div className="stat-value">{spamCount}</div>
                  <div className="stat-delta neutral">honeypot _gotcha</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Active forms</div>
                  <div className="stat-value">{formList.length}</div>
                  <div className="stat-delta neutral">in your account</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Endpoint</div>
                  <div className="stat-value" style={{ fontSize: 13, marginTop: 4 }}>
                    /f/{activeForm?.endpoint.slice(0, 12) ?? "…"}…
                  </div>
                  <div className="stat-delta neutral">live</div>
                </div>
              </div>

              <div className="split-2">
                <div className="forms-sidebar">
                  <div className="panel panel-forms">
                    <div className="panel-header">
                      <span className="panel-title">Forms</span>
                    </div>
                    <div className="panel-body">
                      {formList.map((form) => (
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
                            {form.id === DEMO_FORM_SLUG ? (
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
                          <button
                            type="button"
                            className={`toggle${emailNotifyEnabled ? "" : " off"}`}
                            aria-pressed={emailNotifyEnabled}
                            onClick={() => void toggleEmailNotify()}
                          />
                        </div>
                        {emailNotifyEnabled ? (
                          <div className="setting-row">
                            <span className="setting-label">Notify to</span>
                            <input
                              type="email"
                              value={notifyEmail}
                              onChange={(e) => setNotifyEmail(e.target.value)}
                              onBlur={() =>
                                void saveFormSettings({
                                  emailNotify: true,
                                  notifyEmail: notifyEmail.trim() || undefined,
                                })
                              }
                              placeholder="you@example.com"
                              style={{
                                fontFamily: "var(--mono)",
                                fontSize: 11,
                                background: "transparent",
                                border: "1px solid var(--border)",
                                borderRadius: 6,
                                padding: "4px 8px",
                                color: "var(--text)",
                                maxWidth: 180,
                              }}
                            />
                          </div>
                        ) : null}
                        <div className="setting-row">
                          <span className="setting-label">Webhook on submit</span>
                          <button
                            type="button"
                            className={`toggle${webhookOnSubmitEnabled ? "" : " off"}`}
                            aria-pressed={webhookOnSubmitEnabled}
                            onClick={() => void toggleWebhookOnSubmit()}
                          />
                        </div>
                        {webhookOnSubmitEnabled ? (
                          <div className="setting-row">
                            <span className="setting-label">Webhook URL</span>
                            <input
                              type="url"
                              value={webhookUrl}
                              onChange={(e) => setWebhookUrl(e.target.value)}
                              onBlur={() =>
                                void saveFormSettings({
                                  webhookOnSubmit: true,
                                  webhookUrl: webhookUrl.trim() || undefined,
                                })
                              }
                              placeholder="https://your-api.example/hook"
                              style={{
                                fontFamily: "var(--mono)",
                                fontSize: 11,
                                background: "transparent",
                                border: "1px solid var(--border)",
                                borderRadius: 6,
                                padding: "4px 8px",
                                color: "var(--text)",
                                maxWidth: 180,
                              }}
                            />
                          </div>
                        ) : null}
                        <div className="setting-row">
                          <span className="setting-label">Turnstile spam</span>
                          <button
                            type="button"
                            className={`toggle${turnstileEnabled ? "" : " off"}`}
                            aria-pressed={turnstileEnabled}
                            disabled={!turnstileSiteKey}
                            onClick={() => void toggleTurnstile()}
                          />
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
                            {formRedirectUrl}
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
                      {nonSpamCount} shown · live
                    </span>
                  </div>
                  <div className="panel-body flush">
                    {liveFormsLoading && displayedSubmissions.length === 0 ? (
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
                  disabled={!apiKeysEnabled || creatingKey}
                  onClick={() => void createApiKey()}
                >
                  {creatingKey ? "Creating…" : "+ Create key"}
                </button>
              </div>
            </header>

            <div className="content content--scroll">
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
                    <span style={{ fontFamily: "var(--mono)" }}>
                      {rateLimits.webhook.enabled
                        ? `${rateLimits.webhook.used} / ${rateLimits.webhook.limit}`
                        : `0 / ${rateLimits.webhook.limit}`}
                    </span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Form submissions / month</span>
                    <span style={{ fontFamily: "var(--mono)" }}>
                      {rateLimits.form.enabled
                        ? `${rateLimits.form.used} / ${rateLimits.form.limit}`
                        : `0 / ${rateLimits.form.limit}`}
                    </span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Max inboxes</span>
                    <span style={{ fontFamily: "var(--mono)" }}>3</span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Max forms</span>
                    <span style={{ fontFamily: "var(--mono)" }}>2</span>
                  </div>
                  {!rateLimits.webhook.enabled && !rateLimits.form.enabled ? (
                    <div className="setting-row">
                      <span className="setting-label" style={{ fontSize: 12 }}>
                        Upstash not configured — limits inactive locally
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className={`view${view === "settings" ? " active" : ""}`}>
            <header className="topbar">
              <div>
                <div className="topbar-title">Settings</div>
                <div className="topbar-sub">Environment &amp; storage</div>
              </div>
            </header>

            <div className="content content--scroll">
              <div className="panel hookkit-panel-max">
                <div className="panel-header">
                  <span className="panel-title">Runtime status</span>
                </div>
                <div className="settings-grid">
                  <div className="setting-row">
                    <span className="setting-label">Storage</span>
                    <span style={{ fontFamily: "var(--mono)" }}>
                      {statusInfo?.storage ?? "…"}
                    </span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">App URL</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                      {statusInfo?.appUrl ?? baseUrl}
                    </span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Clerk auth</span>
                    <span className={`pill ${statusInfo?.clerk ? "pill-green" : "pill-amber"}`}>
                      {statusInfo?.clerk ? "enabled" : "off"}
                    </span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Upstash rate limits</span>
                    <span className={`pill ${statusInfo?.upstash ? "pill-green" : "pill-amber"}`}>
                      {statusInfo?.upstash ? "enabled" : "off"}
                    </span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Resend email</span>
                    <span className={`pill ${statusInfo?.resend ? "pill-green" : "pill-amber"}`}>
                      {statusInfo?.resend ? "enabled" : "off"}
                    </span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Turnstile</span>
                    <span className={`pill ${statusInfo?.turnstile ? "pill-green" : "pill-amber"}`}>
                      {statusInfo?.turnstile ? "enabled" : "off"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="panel hookkit-panel-max">
                <div className="panel-header">
                  <span className="panel-title">Resources</span>
                </div>
                <div className="settings-grid">
                  <div className="setting-row">
                    <span className="setting-label">Inboxes</span>
                    <span style={{ fontFamily: "var(--mono)" }}>{inboxList.length}</span>
                  </div>
                  <div className="setting-row">
                    <span className="setting-label">Forms</span>
                    <span style={{ fontFamily: "var(--mono)" }}>{formList.length}</span>
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
