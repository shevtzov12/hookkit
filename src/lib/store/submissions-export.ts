import { isDatabaseEnabled } from "@/lib/db/client";
import { listFormSubmissionsDb } from "@/lib/db/repositories/submissions";
import type { SubmissionRecord } from "@/lib/store/types";
import { MAX_SUBMISSIONS_PER_FORM } from "@/lib/webhooks/constants";
import { listFormSubmissions } from "./submissions";

export async function listAllFormSubmissions(
  formId: string,
  includeSpam = false,
): Promise<SubmissionRecord[]> {
  if (isDatabaseEnabled()) {
    const result = await listFormSubmissionsDb(formId, {
      limit: MAX_SUBMISSIONS_PER_FORM,
      includeSpam,
    });
    return result.submissions;
  }

  const all: SubmissionRecord[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await listFormSubmissions(formId, {
      limit: 100,
      cursor,
      includeSpam,
    });
    all.push(...page.submissions);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return all;
}
