/**
 * Simple rate-limit bench against a webhook inbox URL.
 *
 * Usage:
 *   npx tsx scripts/bench-rate-limit.ts
 *   npx tsx scripts/bench-rate-limit.ts --url http://localhost:3000/h/wh_demo_guest --count 5
 */

const DEFAULT_URL = "http://localhost:3000/h/wh_demo_guest";
const DEFAULT_COUNT = 3;

function parseArgs() {
  const args = process.argv.slice(2);
  let url = DEFAULT_URL;
  let count = DEFAULT_COUNT;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--url" && args[i + 1]) {
      url = args[i + 1];
      i += 1;
    } else if (args[i] === "--count" && args[i + 1]) {
      count = Number.parseInt(args[i + 1], 10);
      i += 1;
    }
  }

  return { url, count: Number.isFinite(count) ? count : DEFAULT_COUNT };
}

async function main() {
  const { url, count } = parseArgs();
  console.log(`Bench: ${count} POST → ${url}\n`);

  const results: Array<{ i: number; status: number; ms: number; retryAfter?: string }> = [];

  for (let i = 1; i <= count; i += 1) {
    const started = Date.now();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "bench.ping", n: i, ts: Date.now() }),
    });
    const ms = Date.now() - started;
    results.push({
      i,
      status: res.status,
      ms,
      retryAfter: res.headers.get("Retry-After") ?? undefined,
    });
    console.log(`#${i}  ${res.status}  ${ms}ms${results.at(-1)?.retryAfter ? `  Retry-After: ${results.at(-1)?.retryAfter}` : ""}`);
  }

  const ok = results.filter((r) => r.status === 200).length;
  const limited = results.filter((r) => r.status === 429).length;
  const p95 = results.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(results.length * 0.95)] ?? 0;

  console.log(`\nSummary: ${ok} ok, ${limited} rate-limited, p95 ${p95}ms`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
