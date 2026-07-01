ALTER TABLE "inboxes" ADD COLUMN IF NOT EXISTS "replay_url" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inbox_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"target_url" text NOT NULL,
	"status_code" integer,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "replays" ADD CONSTRAINT "replays_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "replays" ADD CONSTRAINT "replays_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "replays_inbox_id_created_at_idx" ON "replays" USING btree ("inbox_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "replays_event_id_idx" ON "replays" USING btree ("event_id");
