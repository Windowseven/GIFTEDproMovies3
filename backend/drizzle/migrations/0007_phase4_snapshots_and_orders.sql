CREATE TABLE "commercial_policy_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_type" "commercial_policy_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "commercial_policy_snapshot_categories" (
	"snapshot_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "commercial_policy_snapshot_categories_pk" PRIMARY KEY("snapshot_id", "category_id")
);
--> statement-breakpoint

CREATE TABLE "commercial_policy_snapshot_contents" (
	"snapshot_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	CONSTRAINT "commercial_policy_snapshot_contents_pk" PRIMARY KEY("snapshot_id", "content_id")
);
--> statement-breakpoint

CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"target_kind" "commercial_target_kind" NOT NULL,
	"target_movie_content_id" uuid,
	"target_series_content_id" uuid,
	"target_season_id" uuid,
	"target_episode_id" uuid,
	"plan_version_id" uuid NOT NULL,
	"amount_tzs" integer NOT NULL,
	"duration_value" integer NOT NULL,
	"duration_unit" "duration_unit" NOT NULL,
	"catalog_policy_snapshot_id" uuid,
	"idempotency_key" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_customer_idempotency_unique" UNIQUE("customer_id", "idempotency_key"),
	CONSTRAINT "orders_catalog_policy_snapshot_id_unique" UNIQUE("catalog_policy_snapshot_id"),
	CONSTRAINT "orders_amount_tzs_check" CHECK ("amount_tzs" >= 0),
	CONSTRAINT "orders_duration_value_check" CHECK ("duration_value" > 0),
	CONSTRAINT "orders_target_shape_check" CHECK (
		(
			"target_kind" = 'MOVIE' AND
			"target_movie_content_id" IS NOT NULL AND
			"target_series_content_id" IS NULL AND
			"target_season_id" IS NULL AND
			"target_episode_id" IS NULL AND
			"catalog_policy_snapshot_id" IS NULL
		) OR (
			"target_kind" = 'SERIES' AND
			"target_movie_content_id" IS NULL AND
			"target_series_content_id" IS NOT NULL AND
			"target_season_id" IS NULL AND
			"target_episode_id" IS NULL AND
			"catalog_policy_snapshot_id" IS NULL
		) OR (
			"target_kind" = 'SEASON' AND
			"target_movie_content_id" IS NULL AND
			"target_series_content_id" IS NULL AND
			"target_season_id" IS NOT NULL AND
			"target_episode_id" IS NULL AND
			"catalog_policy_snapshot_id" IS NULL
		) OR (
			"target_kind" = 'EPISODE' AND
			"target_movie_content_id" IS NULL AND
			"target_series_content_id" IS NULL AND
			"target_season_id" IS NULL AND
			"target_episode_id" IS NOT NULL AND
			"catalog_policy_snapshot_id" IS NULL
		) OR (
			"target_kind" = 'CATALOG' AND
			"target_movie_content_id" IS NULL AND
			"target_series_content_id" IS NULL AND
			"target_season_id" IS NULL AND
			"target_episode_id" IS NULL AND
			"catalog_policy_snapshot_id" IS NOT NULL
		)
	)
);
--> statement-breakpoint

ALTER TABLE "commercial_policy_snapshot_categories" ADD CONSTRAINT "comm_pol_snap_cat_snapshot_id_comm_pol_snap_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."commercial_policy_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_policy_snapshot_categories" ADD CONSTRAINT "comm_pol_snap_cat_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "commercial_policy_snapshot_contents" ADD CONSTRAINT "comm_pol_snap_cnt_snapshot_id_comm_pol_snap_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."commercial_policy_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_policy_snapshot_contents" ADD CONSTRAINT "comm_pol_snap_cnt_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_target_movie_content_id_content_id_fk" FOREIGN KEY ("target_movie_content_id") REFERENCES "public"."content"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_target_series_content_id_content_id_fk" FOREIGN KEY ("target_series_content_id") REFERENCES "public"."content"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_target_season_id_seasons_id_fk" FOREIGN KEY ("target_season_id") REFERENCES "public"."seasons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_target_episode_id_episodes_id_fk" FOREIGN KEY ("target_episode_id") REFERENCES "public"."episodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_catalog_policy_snapshot_id_comm_pol_snap_id_fk" FOREIGN KEY ("catalog_policy_snapshot_id") REFERENCES "public"."commercial_policy_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "commercial_policy_snapshot_categories_category_id_idx" ON "commercial_policy_snapshot_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "commercial_policy_snapshot_contents_content_id_idx" ON "commercial_policy_snapshot_contents" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_offer_id_idx" ON "orders" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_target_kind_idx" ON "orders" USING btree ("target_kind");--> statement-breakpoint
CREATE INDEX "orders_plan_version_id_idx" ON "orders" USING btree ("plan_version_id");--> statement-breakpoint
CREATE INDEX "orders_target_movie_content_id_idx" ON "orders" USING btree ("target_movie_content_id");--> statement-breakpoint
CREATE INDEX "orders_target_series_content_id_idx" ON "orders" USING btree ("target_series_content_id");--> statement-breakpoint
CREATE INDEX "orders_target_season_id_idx" ON "orders" USING btree ("target_season_id");--> statement-breakpoint
CREATE INDEX "orders_target_episode_id_idx" ON "orders" USING btree ("target_episode_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
