import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDatabaseEnabled } from "@/lib/db/client";
import {
  appendSubmissionDb,
  listFormSubmissionsDb,
} from "@/lib/db/repositories/submissions";
import { MAX_SUBMISSIONS_PER_FORM } from "@/lib/webhooks/constants";
import type { SubmissionRecord, SubmissionStoreData } from "./types";

export interface ListSubmissionsOptions {
  limit?: number;
  cursor?: string;
  includeSpam?: boolean;
}

export interface ListSubmissionsResult {
  submissions: SubmissionRecord[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
  spamCount: number;
}

function getDataDir(): string {
  return process.env.HOOKKIT_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function getSubmissionsFile(): string {
  return path.join(getDataDir(), "submissions.json");
}

async function ensureStore(): Promise<SubmissionStoreData> {
  const dataDir = getDataDir();
  await mkdir(dataDir, { recursive: true });
  try {
    const raw = await readFile(getSubmissionsFile(), "utf8");
    return JSON.parse(raw) as SubmissionStoreData;
  } catch {
    const empty: SubmissionStoreData = { submissions: [] };
    await writeFile(getSubmissionsFile(), JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
}

async function saveStore(data: SubmissionStoreData): Promise<void> {
  await mkdir(getDataDir(), { recursive: true });
  await writeFile(getSubmissionsFile(), JSON.stringify(data, null, 2), "utf8");
}

export async function appendSubmission(
  submission: Omit<SubmissionRecord, "id" | "receivedAt">,
): Promise<SubmissionRecord> {
  if (isDatabaseEnabled()) {
    return appendSubmissionDb(submission);
  }

  const store = await ensureStore();
  const record: SubmissionRecord = {
    ...submission,
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
  };

  store.submissions.unshift(record);

  const perForm = store.submissions.filter((s) => s.formId === submission.formId);
  if (perForm.length > MAX_SUBMISSIONS_PER_FORM) {
    const dropIds = new Set(perForm.slice(MAX_SUBMISSIONS_PER_FORM).map((s) => s.id));
    store.submissions = store.submissions.filter((s) => !dropIds.has(s.id));
  }

  await saveStore(store);
  return record;
}

export async function listFormSubmissions(
  formId: string,
  options: ListSubmissionsOptions = {},
): Promise<ListSubmissionsResult> {
  if (isDatabaseEnabled()) {
    return listFormSubmissionsDb(formId, options);
  }

  const limit = options.limit ?? 50;
  const store = await ensureStore();
  const all = store.submissions.filter((s) => s.formId === formId);
  const spamCount = all.filter((s) => s.spam).length;

  let slice = options.includeSpam ? all : all.filter((s) => !s.spam);
  if (options.cursor) {
    const cursorIndex = slice.findIndex((s) => s.id === options.cursor);
    slice = cursorIndex >= 0 ? slice.slice(cursorIndex + 1) : slice;
  }

  const page = slice.slice(0, limit);
  const hasMore = slice.length > limit;

  return {
    submissions: page,
    nextCursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
    hasMore,
    total: slice.length,
    spamCount,
  };
}
