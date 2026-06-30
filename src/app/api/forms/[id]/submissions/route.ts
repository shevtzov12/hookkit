import { requireReadAccess } from "@/lib/auth/require-access";
import { formatRelativeTime } from "@/lib/format-time";
import { listFormSubmissions } from "@/lib/store/submissions";
import {
  DEFAULT_SUBMISSIONS_PAGE_SIZE,
  MAX_SUBMISSIONS_PAGE_SIZE,
  PUBLIC_ID_PATTERN,
} from "@/lib/webhooks/constants";

export const dynamic = "force-dynamic";

function parseLimit(value: string | null): number {
  if (!value) return DEFAULT_SUBMISSIONS_PAGE_SIZE;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_SUBMISSIONS_PAGE_SIZE;
  return Math.min(n, MAX_SUBMISSIONS_PAGE_SIZE);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!PUBLIC_ID_PATTERN.test(id)) {
    return Response.json({ ok: false, error: "invalid form id" }, { status: 400 });
  }

  const access = await requireReadAccess(request, id, "form");
  if (!access.ok) return access.response;

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const includeSpam = url.searchParams.get("includeSpam") === "1";

  const { submissions, nextCursor, hasMore, total, spamCount } = await listFormSubmissions(
    id,
    { limit, cursor, includeSpam },
  );

  return Response.json({
    formId: id,
    submissions: submissions.map((record) => ({
      id: record.id,
      email: record.email ?? "—",
      message: record.message ?? "",
      source: record.source ?? "—",
      spam: record.spam,
      time: formatRelativeTime(record.receivedAt),
      fields: record.fields,
      receivedAt: record.receivedAt,
    })),
    pagination: {
      limit,
      total,
      hasMore,
      nextCursor,
      spamCount,
    },
  });
}
