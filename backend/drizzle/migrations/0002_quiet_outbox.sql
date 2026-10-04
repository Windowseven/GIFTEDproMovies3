CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"encrypted_payload" text NOT NULL,
	"payload_iv" varchar(32) NOT NULL,
	"payload_tag" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" varchar(128),
	"lease_until" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"next_retry_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"provider_message_id" varchar(128),
	"failure_code" varchar(64),
	"failure_reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_outbox_status_available_at_idx" ON "email_outbox" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "email_outbox_lease_until_idx" ON "email_outbox" USING btree ("lease_until");--> statement-breakpoint
CREATE INDEX "email_outbox_event_type_status_idx" ON "email_outbox" USING btree ("event_type","status");
