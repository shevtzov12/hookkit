import { and, desc, eq, lt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { forms, submissions } from "@/lib/db/schema";
import { DEMO_FORM_SLUG } from "@/lib/mock-data";
import type { ListSubmissionsOptions, ListSubmissionsResult } from "@/lib/store/submissions";
import type { SubmissionRecord } from "@/lib/store/types";

const MAX_SUBMISSIONS_PER_FORM = 1000;

async function getFormUuid(publicId: string) {
  const db = getDb();
  const [form] = await db
    .select({ id: forms.id })
    .from(forms)
    .where(eq(forms.publicId, publicId))
    .limit(1);

  if (!form) {
    const [created] = await db
      .insert(forms)
      .values({
        publicId,
        name: publicId,
        isGuest: publicId === DEMO_FORM_SLUG,
      })
      .onConflictDoNothing({ target: forms.publicId })
      .returning({ id: forms.id });

    if (created) return created.id;

    const [existing] = await db
      .select({ id: forms.id })
      .from(forms)
      .where(eq(forms.publicId, publicId))
      .limit(1);
    if (!existing) throw new Error(`form not found: ${publicId}`);
    return existing.id;
  }

  return form.id;
}

export async function appendSubmissionDb(
  submission: Omit<SubmissionRecord, "id" | "receivedAt">,
): Promise<SubmissionRecord> {
  const db = getDb();
  const formUuid = await getFormUuid(submission.formId);

  const [record] = await db
    .insert(submissions)
    .values({
      formId: formUuid,
      fields: submission.fields,
      email: submission.email,
      message: submission.message,
      source: submission.source,
      spam: submission.spam,
    })
    .returning();

  const overflow = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.formId, formUuid))
    .orderBy(desc(submissions.receivedAt))
    .offset(MAX_SUBMISSIONS_PER_FORM);

  if (overflow.length > 0) {
    for (const row of overflow) {
      await db.delete(submissions).where(eq(submissions.id, row.id));
    }
  }

  return {
    id: record.id,
    formId: submission.formId,
    fields: record.fields as Record<string, string>,
    email: record.email,
    message: record.message,
    source: record.source,
    spam: record.spam,
    receivedAt: record.receivedAt.toISOString(),
  };
}

export async function listFormSubmissionsDb(
  formId: string,
  options: ListSubmissionsOptions = {},
): Promise<ListSubmissionsResult> {
  const db = getDb();
  const limit = options.limit ?? 50;

  const [form] = await db
    .select({ id: forms.id })
    .from(forms)
    .where(eq(forms.publicId, formId))
    .limit(1);

  if (!form) {
    return { submissions: [], nextCursor: null, hasMore: false, total: 0, spamCount: 0 };
  }

  let cursorReceivedAt: Date | null = null;
  if (options.cursor) {
    const [cursorRow] = await db
      .select({ receivedAt: submissions.receivedAt })
      .from(submissions)
      .where(and(eq(submissions.id, options.cursor), eq(submissions.formId, form.id)))
      .limit(1);
    cursorReceivedAt = cursorRow?.receivedAt ?? null;
  }

  const whereClause = cursorReceivedAt
    ? and(eq(submissions.formId, form.id), lt(submissions.receivedAt, cursorReceivedAt))
    : eq(submissions.formId, form.id);

  const rows = await db
    .select()
    .from(submissions)
    .where(whereClause)
    .orderBy(desc(submissions.receivedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const filtered = options.includeSpam ? page : page.filter((r) => !r.spam);

  const allRows = await db
    .select({ spam: submissions.spam })
    .from(submissions)
    .where(eq(submissions.formId, form.id));

  const spamCount = allRows.filter((r) => r.spam).length;
  const nonSpamTotal = allRows.filter((r) => !r.spam).length;

  return {
    submissions: filtered.map((row) => ({
      id: row.id,
      formId,
      fields: row.fields as Record<string, string>,
      email: row.email,
      message: row.message,
      source: row.source,
      spam: row.spam,
      receivedAt: row.receivedAt.toISOString(),
    })),
    nextCursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
    hasMore,
    total: options.includeSpam ? allRows.length : nonSpamTotal,
    spamCount,
  };
}
