CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"provider_name" varchar(64) NOT NULL,
	"provider_reference" varchar(128),
	"provider_event_id" varchar(128),
	"status" "payment_attempt_status" DEFAULT 'PENDING' NOT NULL,
	"amount_tzs" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_order_attempt_unique" UNIQUE("order_id", "attempt_number"),
	CONSTRAINT "payment_attempts_provider_event_unique" UNIQUE("provider_name", "provider_event_id"),
	CONSTRAINT "payment_attempts_attempt_number_check" CHECK ("attempt_number" > 0),
	CONSTRAINT "payment_attempts_amount_tzs_check" CHECK ("amount_tzs" >= 0)
);
--> statement-breakpoint

CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_attempt_id" uuid NOT NULL,
	"provider_name" varchar(64) NOT NULL,
	"provider_event_id" varchar(128) NOT NULL,
	"provider_reference" varchar(128) NOT NULL,
	"amount_tzs" integer NOT NULL,
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlements_payment_attempt_id_unique" UNIQUE("payment_attempt_id"),
	CONSTRAINT "settlements_provider_event_unique" UNIQUE("provider_name", "provider_event_id"),
	CONSTRAINT "settlements_amount_tzs_check" CHECK ("amount_tzs" >= 0)
);
--> statement-breakpoint

ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "settlements" ADD CONSTRAINT "settlements_payment_attempt_id_payment_attempts_id_fk" FOREIGN KEY ("payment_attempt_id") REFERENCES "public"."payment_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "payment_attempts_provider_reference_idx" ON "payment_attempts" USING btree ("provider_name", "provider_reference") WHERE "provider_reference" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_single_unresolved_idx" ON "payment_attempts" USING btree ("order_id") WHERE "status" IN ('PENDING', 'UNKNOWN');--> statement-breakpoint

CREATE INDEX "payment_attempts_order_id_idx" ON "payment_attempts" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_status_idx" ON "payment_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "settlements_provider_reference_idx" ON "settlements" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX "settlements_settled_at_idx" ON "settlements" USING btree ("settled_at");
