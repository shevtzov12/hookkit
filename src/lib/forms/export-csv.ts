import type { SubmissionRecord } from "@/lib/store/types";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function submissionsToCsv(
  submissions: SubmissionRecord[],
  formId: string,
): string {
  const header = ["id", "receivedAt", "email", "message", "source", "spam", "fields"];
  const rows = submissions.map((record) => [
    record.id,
    record.receivedAt,
    record.email ?? "",
    record.message ?? "",
    record.source ?? "",
    record.spam ? "true" : "false",
    JSON.stringify(record.fields),
  ]);

  const lines = [
    `# HookKit export — form ${formId}`,
    header.join(","),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(",")),
  ];

  return `${lines.join("\r\n")}\r\n`;
}
