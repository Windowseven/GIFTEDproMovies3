CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" "offer_status" DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"target_kind" "commercial_target_kind" NOT NULL,
	"target_movie_content_id" uuid,
	"target_series_content_id" uuid,
	"target_season_id" uuid,
	"target_episode_id" uuid,
	"plan_version_id" uuid NOT NULL,
	"price_tzs" integer NOT NULL,
	"catalog_policy_type" "commercial_policy_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_code_unique" UNIQUE("code"),
	CONSTRAINT "offers_price_tzs_check" CHECK ("price_tzs" >= 0),
	CONSTRAINT "offers_date_window_check" CHECK ("ends_at" IS NULL OR "ends_at" > "starts_at"),
	CONSTRAINT "offers_target_shape_check" CHECK (
		(
			"target_kind" = 'MOVIE' AND
			"target_movie_content_id" IS NOT NULL AND
			"target_series_content_id" IS NULL AND
			"target_season_id" IS NULL AND
			"target_episode_id" IS NULL AND
			"catalog_policy_type" IS NULL
		) OR (
			"target_kind" = 'SERIES' AND
			"target_movie_content_id" IS NULL AND
			"target_series_content_id" IS NOT NULL AND
			"target_season_id" IS NULL AND
			"target_episode_id" IS NULL AND
			"catalog_policy_type" IS NULL
		) OR (
			"target_kind" = 'SEASON' AND
			"target_movie_content_id" IS NULL AND
			"target_series_content_id" IS NULL AND
			"target_season_id" IS NOT NULL AND
			"target_episode_id" IS NULL AND
			"catalog_policy_type" IS NULL
		) OR (
			"target_kind" = 'EPISODE' AND
			"target_movie_content_id" IS NULL AND
			"target_series_content_id" IS NULL AND
			"target_season_id" IS NULL AND
			"target_episode_id" IS NOT NULL AND
			"catalog_policy_type" IS NULL
		) OR (
			"target_kind" = 'CATALOG' AND
			"target_movie_content_id" IS NULL AND
			"target_series_content_id" IS NULL AND
			"target_season_id" IS NULL AND
			"target_episode_id" IS NULL AND
			"catalog_policy_type" IS NOT NULL
		)
	)
);
--> statement-breakpoint

CREATE TABLE "offer_catalog_policy_category_members" (
	"offer_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "offer_catalog_policy_category_members_pk" PRIMARY KEY("offer_id", "category_id")
);
--> statement-breakpoint

CREATE TABLE "offer_catalog_policy_content_members" (
	"offer_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	CONSTRAINT "offer_catalog_policy_content_members_pk" PRIMARY KEY("offer_id", "content_id")
);
--> statement-breakpoint

ALTER TABLE "offers" ADD CONSTRAINT "offers_target_movie_content_id_content_id_fk" FOREIGN KEY ("target_movie_content_id") REFERENCES "public"."content"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_target_series_content_id_content_id_fk" FOREIGN KEY ("target_series_content_id") REFERENCES "public"."content"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_target_season_id_seasons_id_fk" FOREIGN KEY ("target_season_id") REFERENCES "public"."seasons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_target_episode_id_episodes_id_fk" FOREIGN KEY ("target_episode_id") REFERENCES "public"."episodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "offer_catalog_policy_category_members" ADD CONSTRAINT "offer_cat_policy_cat_mem_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_catalog_policy_category_members" ADD CONSTRAINT "offer_cat_policy_cat_mem_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "offer_catalog_policy_content_members" ADD CONSTRAINT "offer_cat_policy_cnt_mem_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_catalog_policy_content_members" ADD CONSTRAINT "offer_cat_policy_cnt_mem_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "offers_status_idx" ON "offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "offers_target_kind_idx" ON "offers" USING btree ("target_kind");--> statement-breakpoint
CREATE INDEX "offers_plan_version_id_idx" ON "offers" USING btree ("plan_version_id");--> statement-breakpoint
CREATE INDEX "offers_target_movie_content_id_idx" ON "offers" USING btree ("target_movie_content_id");--> statement-breakpoint
CREATE INDEX "offers_target_series_content_id_idx" ON "offers" USING btree ("target_series_content_id");--> statement-breakpoint
CREATE INDEX "offers_target_season_id_idx" ON "offers" USING btree ("target_season_id");--> statement-breakpoint
CREATE INDEX "offers_target_episode_id_idx" ON "offers" USING btree ("target_episode_id");--> statement-breakpoint
CREATE INDEX "offer_catalog_policy_category_members_category_id_idx" ON "offer_catalog_policy_category_members" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "offer_catalog_policy_content_members_content_id_idx" ON "offer_catalog_policy_content_members" USING btree ("content_id");
