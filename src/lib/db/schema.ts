import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  clerkId: text("clerk_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    label: text("label").notNull().default("default"),
    environment: text("environment").notNull().default("live"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("api_keys_user_id_idx").on(table.userId)],
);

export const inboxes = pgTable(
  "inboxes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull().unique(),
    name: text("name").notNull(),
    paused: boolean("paused").notNull().default(false),
    replayUrl: text("replay_url"),
    isGuest: boolean("is_guest").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("inboxes_public_id_idx").on(table.publicId)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inboxId: uuid("inbox_id")
      .notNull()
      .references(() => inboxes.id, { onDelete: "cascade" }),
    method: text("method").notNull(),
    headers: jsonb("headers").notNull().default({}),
    query: jsonb("query").notNull().default({}),
    body: jsonb("body"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("events_inbox_id_received_at_idx").on(table.inboxId, table.receivedAt),
  ],
);

export const forms = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    publicId: text("public_id").notNull().unique(),
    name: text("name").notNull(),
    settings: jsonb("settings").notNull().default({}),
    isGuest: boolean("is_guest").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("forms_public_id_idx").on(table.publicId)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    fields: jsonb("fields").notNull().default({}),
    email: text("email"),
    message: text("message"),
    source: text("source"),
    spam: boolean("spam").notNull().default(false),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("submissions_form_id_received_at_idx").on(table.formId, table.receivedAt),
  ],
);

export const replays = pgTable(
  "replays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inboxId: uuid("inbox_id")
      .notNull()
      .references(() => inboxes.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    targetUrl: text("target_url").notNull(),
    statusCode: integer("status_code"),
    durationMs: integer("duration_ms").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("replays_inbox_id_created_at_idx").on(table.inboxId, table.createdAt),
    index("replays_event_id_idx").on(table.eventId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  inboxes: many(inboxes),
  forms: many(forms),
}));

export const inboxesRelations = relations(inboxes, ({ many }) => ({
  events: many(events),
  replays: many(replays),
}));

export const formsRelations = relations(forms, ({ many }) => ({
  submissions: many(submissions),
}));

export type User = typeof users.$inferSelect;
export type Inbox = typeof inboxes.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Replay = typeof replays.$inferSelect;
