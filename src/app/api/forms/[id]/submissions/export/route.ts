import { requireReadAccess } from "@/lib/auth/require-access";
import { submissionsToCsv } from "@/lib/forms/export-csv";
import { listAllFormSubmissions } from "@/lib/store/submissions-export";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";

export const dynamic = "force-dynamic";

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
  const includeSpam = url.searchParams.get("includeSpam") === "1";

  const submissions = await listAllFormSubmissions(id, includeSpam);
  const csv = submissionsToCsv(submissions, id);
  const filename = `hookkit-${id}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
