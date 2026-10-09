CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"target_kind" "commercial_target_kind" NOT NULL,
	"target_movie_content_id" uuid,
	"target_series_content_id" uuid,
	"target_season_id" uuid,
	"target_episode_id" uuid,
	"status" "entitlement_status" DEFAULT 'ACTIVE' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	"revoked_by" uuid,
	CONSTRAINT "entitlements_finite_expiry_check" CHECK ("expires_at" > "starts_at"),
	CONSTRAINT "entitlements_target_shape_check" CHECK (
		(
			"target_kind" = 'MOVIE' AND
			"target_movie_content_id" IS NOT NULL AND
			"target_series_content_id" IS NULL AND
			"target_season_id" IS NULL AND
			"target_episode_id" IS NULL
		) OR (
			"target_kind" = 'SERIES' AND
			"target_movie_content_id" IS NULL AND
			"target_series_content_id" IS NOT NULL AND
			"target_season_id" IS NULL AND
			"target_episode_id" IS NULL
		) OR (
			"target_kind" = 'SEASON' AND
			"target_movie_content_id" IS NULL AND
			"target_series_content_id" IS NULL AND
			"target_season_id" IS NOT NULL AND
			"target_episode_id" IS NULL
		) OR (
			"target_kind" = 'EPISODE' AND
			"target_movie_content_id" IS NULL AND
			"target_series_content_id" IS NULL AND
			"target_season_id" IS NULL AND
			"target_episode_id" IS NOT NULL
		) OR (
			"target_kind" = 'CATALOG' AND
			"target_movie_content_id" IS NULL AND
			"target_series_content_id" IS NULL AND
			"target_season_id" IS NULL AND
			"target_episode_id" IS NULL
		)
	),
	CONSTRAINT "entitlements_revocation_consistency_check" CHECK (
		(
			"status" = 'REVOKED' AND
			"revoked_at" IS NOT NULL AND
			"revocation_reason" IS NOT NULL
		) OR (
			"status" IN ('ACTIVE', 'EXPIRED') AND
			"revoked_at" IS NULL AND
			"revocation_reason" IS NULL AND
			"revoked_by" IS NULL
		)
	)
);
--> statement-breakpoint

CREATE TABLE "entitlement_order_effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"effect_kind" "entitlement_effect_kind" NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at_after" timestamp with time zone NOT NULL,
	CONSTRAINT "entitlement_order_effects_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint

ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_target_movie_content_id_content_id_fk" FOREIGN KEY ("target_movie_content_id") REFERENCES "public"."content"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_target_series_content_id_content_id_fk" FOREIGN KEY ("target_series_content_id") REFERENCES "public"."content"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_target_season_id_seasons_id_fk" FOREIGN KEY ("target_season_id") REFERENCES "public"."seasons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_target_episode_id_episodes_id_fk" FOREIGN KEY ("target_episode_id") REFERENCES "public"."episodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "entitlement_order_effects" ADD CONSTRAINT "entitlement_order_effects_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_order_effects" ADD CONSTRAINT "entitlement_order_effects_entitlement_id_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."entitlements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "entitlements_customer_movie_idx" ON "entitlements" USING btree ("customer_id", "target_movie_content_id") WHERE "target_kind" = 'MOVIE' AND "target_movie_content_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_customer_series_idx" ON "entitlements" USING btree ("customer_id", "target_series_content_id") WHERE "target_kind" = 'SERIES' AND "target_series_content_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_customer_season_idx" ON "entitlements" USING btree ("customer_id", "target_season_id") WHERE "target_kind" = 'SEASON' AND "target_season_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_customer_episode_idx" ON "entitlements" USING btree ("customer_id", "target_episode_id") WHERE "target_kind" = 'EPISODE' AND "target_episode_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_customer_catalog_idx" ON "entitlements" USING btree ("customer_id") WHERE "target_kind" = 'CATALOG';--> statement-breakpoint

CREATE INDEX "entitlements_customer_id_idx" ON "entitlements" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "entitlements_status_expires_at_idx" ON "entitlements" USING btree ("status", "expires_at");--> statement-breakpoint
CREATE INDEX "entitlements_target_movie_content_id_idx" ON "entitlements" USING btree ("target_movie_content_id");--> statement-breakpoint
CREATE INDEX "entitlements_target_series_content_id_idx" ON "entitlements" USING btree ("target_series_content_id");--> statement-breakpoint
CREATE INDEX "entitlements_target_season_id_idx" ON "entitlements" USING btree ("target_season_id");--> statement-breakpoint
CREATE INDEX "entitlements_target_episode_id_idx" ON "entitlements" USING btree ("target_episode_id");--> statement-breakpoint

CREATE INDEX "entitlement_order_effects_entitlement_id_idx" ON "entitlement_order_effects" USING btree ("entitlement_id");
