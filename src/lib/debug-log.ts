import { appendFile } from "node:fs/promises";
import path from "node:path";

const DEBUG_ENDPOINT =
  "http://127.0.0.1:7452/ingest/edd7f40a-e076-408b-ae48-8fe515b70e27";
const DEBUG_SESSION = "3d7543";
const LOG_PATH = path.join(process.cwd(), "debug-3d7543.log");

/** Foldable debug instrumentation for CP-1/CP-2 runtime verification. */
export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "pre-fix",
): void {
  const payload = {
    sessionId: DEBUG_SESSION,
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };

  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});

  appendFile(LOG_PATH, `${JSON.stringify(payload)}\n`).catch(() => {});
  // #endregion
}
