export interface WebhookEventRecord {
  id: string;
  inboxId: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  receivedAt: string;
}

export interface EventStoreData {
  events: WebhookEventRecord[];
}

export interface SubmissionRecord {
  id: string;
  formId: string;
  fields: Record<string, string>;
  email: string | null;
  message: string | null;
  source: string | null;
  spam: boolean;
  receivedAt: string;
}

export interface SubmissionStoreData {
  submissions: SubmissionRecord[];
}
