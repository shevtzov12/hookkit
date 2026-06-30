/** Max webhook body size (256 KB). */
export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

/** Default page size for events list. */
export const DEFAULT_EVENTS_PAGE_SIZE = 50;

/** Max page size for events list. */
export const MAX_EVENTS_PAGE_SIZE = 100;

/** Max events retained per inbox in file store. */
export const MAX_EVENTS_PER_INBOX = 500;

/** Public resource id: letters, digits, underscore, hyphen. */
export const PUBLIC_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

/** @deprecated use PUBLIC_ID_PATTERN */
export const INBOX_ID_PATTERN = PUBLIC_ID_PATTERN;

/** Honeypot field name — bots fill this, humans leave empty. */
export const HONEYPOT_FIELD = "_gotcha";

/** Max submissions retained per form in file store. */
export const MAX_SUBMISSIONS_PER_FORM = 1000;

/** Default page size for submissions list. */
export const DEFAULT_SUBMISSIONS_PAGE_SIZE = 50;

/** Max page size for submissions list. */
export const MAX_SUBMISSIONS_PAGE_SIZE = 100;
