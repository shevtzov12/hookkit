export type DashboardView = "webhooks" | "forms" | "apikeys";

export type EmbedTab = "html" | "fetch" | "curl";

export interface Inbox {
  id: string;
  name: string;
  url: string;
  events: number;
  active: boolean;
}

export interface WebhookEvent {
  id: number;
  method: string;
  type: string;
  time: string;
  status: number;
  payload: Record<string, unknown>;
}

export interface FormItem {
  id: string;
  name: string;
  endpoint: string;
  subs: number;
  active: boolean;
}

export interface Submission {
  time: string;
  email: string;
  message: string;
  source: string;
  spam: boolean;
}

export const INBOXES: Inbox[] = [
  {
    id: "stripe",
    name: "Stripe Production",
    url: "wh_stripe_prod_x7k2",
    events: 24,
    active: true,
  },
  {
    id: "github",
    name: "GitHub Webhooks",
    url: "wh_github_dev_m3n8",
    events: 8,
    active: false,
  },
  {
    id: "demo",
    name: "Demo (read-only)",
    url: "wh_demo_guest",
    events: 5,
    active: false,
  },
];

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  {
    id: 1,
    method: "POST",
    type: "checkout.session.completed",
    time: "2m ago",
    status: 200,
    payload: {
      id: "evt_1QxK2mN8vR4eT7yW",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_live_a1B2c3D4",
          amount_total: 2900,
          currency: "usd",
          customer_email: "client@example.com",
          payment_status: "paid",
          metadata: { plan: "pro" },
        },
      },
      created: 1719331200,
    },
  },
  {
    id: 2,
    method: "POST",
    type: "customer.subscription.updated",
    time: "18m ago",
    status: 200,
    payload: {
      id: "evt_2AbC3dE4fG5hI6jK",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1LxY9zQwErTy",
          status: "active",
          current_period_end: 1722009600,
          items: { data: [{ price: { id: "price_pro_monthly" } }] },
        },
      },
    },
  },
  {
    id: 3,
    method: "POST",
    type: "invoice.payment_failed",
    time: "1h ago",
    status: 200,
    payload: {
      id: "evt_3MnO4pQrStUvWxYz",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_1FailPay123",
          customer: "cus_ABC123",
          amount_due: 2900,
          attempt_count: 2,
          next_payment_attempt: 1719417600,
        },
      },
    },
  },
  {
    id: 4,
    method: "POST",
    type: "payment_intent.succeeded",
    time: "3h ago",
    status: 200,
    payload: {
      id: "evt_4PiQ5rStUvWxYzAb",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_3Success789",
          amount: 2900,
          currency: "usd",
          status: "succeeded",
        },
      },
    },
  },
];

export const FORMS: FormItem[] = [
  {
    id: "contact",
    name: "Landing Contact",
    endpoint: "frm_contact_l9x4",
    subs: 142,
    active: true,
  },
  {
    id: "waitlist",
    name: "Product Waitlist",
    endpoint: "frm_waitlist_k2m7",
    subs: 14,
    active: false,
  },
];

export const SUBMISSIONS: Submission[] = [
  {
    time: "5m ago",
    email: "maria@startup.io",
    message: "Need Stripe + CRM integration",
    source: "landing",
    spam: false,
  },
  {
    time: "2h ago",
    email: "dev@agency.com",
    message: "How much for white-label?",
    source: "landing",
    spam: false,
  },
  {
    time: "5h ago",
    email: "bot@spam.ru",
    message: "buy viagra cheap",
    source: "landing",
    spam: true,
  },
  {
    time: "1d ago",
    email: "hello@corp.de",
    message: "Demo call next week?",
    source: "/pricing",
    spam: false,
  },
  {
    time: "2d ago",
    email: "founder@saas.co",
    message: "Webhook replay is exactly what we needed",
    source: "landing",
    spam: false,
  },
];

export const EMBED_SNIPPETS: Record<EmbedTab, string> = {
  html: `<form action="https://hookkit.app/f/frm_contact_l9x4"
      method="POST">
  <input name="email" type="email" required />
  <input name="message" type="text" />
  <input name="_gotcha" style="display:none" />
  <button type="submit">Send</button>
</form>`,
  fetch: `await fetch('https://hookkit.app/f/frm_contact_l9x4', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    message: 'Hello!'
  })
});`,
  curl: `curl -X POST https://hookkit.app/f/frm_contact_l9x4 \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","message":"Hello!"}'`,
};

export function getInboxUrl(publicId: string, baseUrl = "https://hookkit.app") {
  return `${baseUrl}/h/${publicId}`;
}

export function getFormUrl(publicId: string, baseUrl = "https://hookkit.app") {
  return `${baseUrl}/f/${publicId}`;
}
