CREATE TABLE "fulfillments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "fulfillment_status" DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_code" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	CONSTRAINT "fulfillments_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "fulfillments_attempt_count_check" CHECK ("attempt_count" >= 0),
	CONSTRAINT "fulfillments_status_timestamps_check" CHECK (
		(
			"status" = 'PENDING' AND
			"completed_at" IS NULL AND
			"failed_at" IS NULL
		) OR (
			"status" = 'COMPLETED' AND
			"completed_at" IS NOT NULL AND
			"failed_at" IS NULL
		) OR (
			"status" = 'FAILED_RETRYABLE' AND
			"completed_at" IS NULL AND
			"failed_at" IS NOT NULL
		) OR (
			"status" = 'FAILED_TERMINAL' AND
			"completed_at" IS NULL AND
			"failed_at" IS NOT NULL
		)
	)
);
--> statement-breakpoint

ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "fulfillments_status_idx" ON "fulfillments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fulfillments_created_at_idx" ON "fulfillments" USING btree ("created_at");
