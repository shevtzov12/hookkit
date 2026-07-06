/**
 * Staging / production smoke checks.
 *
 * Usage:
 *   npm run smoke:staging
 *   npm run smoke:staging -- --url https://hookkit-xxx.vercel.app
 */

const DEMO_INBOX = "wh_demo_guest";
const DEMO_FORM = "frm_demo_guest";

function parseArgs(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--url" && args[i + 1]) return args[i + 1].replace(/\/$/, "");
    if (/^https?:\/\//i.test(args[i])) return args[i].replace(/\/$/, "");
  }
  return (
    process.env.SMOKE_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

type CheckResult = { name: string; ok: boolean; detail: string; ms: number };

async function runCheck(
  name: string,
  fn: () => Promise<{ ok: boolean; detail: string }>,
): Promise<CheckResult> {
  const started = Date.now();
  try {
    const { ok, detail } = await fn();
    return { name, ok, detail, ms: Date.now() - started };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : "unknown error",
      ms: Date.now() - started,
    };
  }
}

async function main() {
  const base = parseArgs();
  console.log(`HookKit smoke → ${base}\n`);

  const checks: CheckResult[] = [];

  checks.push(
    await runCheck("health", async () => {
      const res = await fetch(`${base}/api/health`);
      const data = (await res.json()) as { ok?: boolean; maintenance?: boolean };
      return {
        ok: res.ok && data.ok === true,
        detail: `maintenance=${data.maintenance ?? false}`,
      };
    }),
  );

  checks.push(
    await runCheck("dashboard status", async () => {
      const res = await fetch(`${base}/api/dashboard/status`);
      if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
      const data = (await res.json()) as { storage?: string; clerk?: boolean; upstash?: boolean };
      return {
        ok: true,
        detail: `storage=${data.storage} clerk=${data.clerk} upstash=${data.upstash}`,
      };
    }),
  );

  checks.push(
    await runCheck("webhook ingest", async () => {
      const res = await fetch(`${base}/h/${DEMO_INBOX}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "smoke.ping", ts: Date.now() }),
      });
      const data = (await res.json()) as { ok?: boolean; eventId?: string };
      return {
        ok: res.ok && data.ok === true && Boolean(data.eventId),
        detail: res.ok ? `eventId=${data.eventId ?? "—"}` : `HTTP ${res.status}`,
      };
    }),
  );

  checks.push(
    await runCheck("inbox events", async () => {
      const res = await fetch(`${base}/api/inboxes/${DEMO_INBOX}/events`);
      if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
      const data = (await res.json()) as { events?: unknown[] };
      return { ok: true, detail: `${data.events?.length ?? 0} events` };
    }),
  );

  checks.push(
    await runCheck("form submit", async () => {
      const res = await fetch(`${base}/f/${DEMO_FORM}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "smoke@hookkit.local",
          message: "smoke test",
          source: "smoke-staging",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; submissionId?: string };
      return {
        ok: res.ok && data.ok === true,
        detail: data.submissionId ? `id=${data.submissionId}` : `HTTP ${res.status}`,
      };
    }),
  );

  checks.push(
    await runCheck("inbox stats", async () => {
      const res = await fetch(`${base}/api/inboxes/${DEMO_INBOX}/stats`);
      if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
      const data = (await res.json()) as { today?: number; total?: number };
      return { ok: true, detail: `today=${data.today ?? 0} total=${data.total ?? 0}` };
    }),
  );

  checks.push(
    await runCheck("landing", async () => {
      const res = await fetch(base, { redirect: "manual" });
      const maintenance = res.status === 200 && (await res.text()).includes("Staging");
      const ok = res.status === 200;
      return {
        ok,
        detail: maintenance ? "maintenance page" : `HTTP ${res.status}`,
      };
    }),
  );

  let passed = 0;
  for (const c of checks) {
    const mark = c.ok ? "OK" : "FAIL";
    console.log(`${mark.padEnd(5)} ${c.name} (${c.ms}ms) — ${c.detail}`);
    if (c.ok) passed += 1;
  }

  console.log(`\n${passed}/${checks.length} passed`);
  if (passed < checks.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
