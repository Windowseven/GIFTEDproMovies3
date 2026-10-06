CREATE TYPE "public"."content_status" AS ENUM('draft', 'pending_review', 'published', 'unpublished', 'archived');--> statement-breakpoint

CREATE TYPE "public"."content_type" AS ENUM('movie', 'series');--> statement-breakpoint

CREATE TYPE "public"."episode_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint

CREATE TYPE "public"."media_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint

CREATE TYPE "public"."pricing_model" AS ENUM('per_episode', 'per_season', 'full_series', 'combination');--> statement-breakpoint

CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"flag_emoji" varchar(16),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "dj_voice_artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"stage_name" varchar(150) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"avatar_url" text,
	"bio" text,
	"tier" varchar(50),
	"contract_type" varchar(50),
	"color_hex" varchar(10),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_id" varchar(32) NOT NULL,
	"content_type" "content_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"original_title" varchar(255),
	"slug" varchar(280) NOT NULL,
	"release_year" integer,
	"description" text,
	"poster_url" text,
	"backdrop_url" text,
	"trailer_url" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_trending" boolean DEFAULT false NOT NULL,
	"duration_minutes" integer,
	"created_by" uuid NOT NULL,
	"submitted_by" uuid,
	"assigned_to" uuid,
	"approved_by" uuid,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"unpublished_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_code_id_unique" UNIQUE("code_id")
);
--> statement-breakpoint

CREATE TABLE "movie_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"dj_id" uuid NOT NULL,
	"streaming_file_key" text,
	"download_file_key" text,
	"streaming_status" "media_status" DEFAULT 'pending' NOT NULL,
	"download_status" "media_status" DEFAULT 'pending' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "series_metadata" (
	"content_id" uuid PRIMARY KEY NOT NULL,
	"lead_dj_id" uuid,
	"pricing_model" "pricing_model" DEFAULT 'per_episode' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"season_number" integer NOT NULL,
	"title" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"episode_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"duration_minutes" integer,
	"description" text,
	"thumbnail_url" text,
	"dj_id" uuid,
	"streaming_file_key" text,
	"download_file_key" text,
	"streaming_status" "media_status" DEFAULT 'pending' NOT NULL,
	"download_status" "media_status" DEFAULT 'pending' NOT NULL,
	"status" "episode_status" DEFAULT 'draft' NOT NULL,
	"is_available" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "content_categories" (
	"content_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_categories_content_id_category_id_pk" PRIMARY KEY("content_id","category_id")
);
--> statement-breakpoint

CREATE TABLE "content_countries" (
	"content_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_countries_content_id_country_id_pk" PRIMARY KEY("content_id","country_id")
);
--> statement-breakpoint

CREATE TABLE "content_review_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"assigned_to" uuid,
	"rejection_reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "system_settings" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "content" ADD CONSTRAINT "content_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "content" ADD CONSTRAINT "content_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "content" ADD CONSTRAINT "content_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "content" ADD CONSTRAINT "content_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "movie_editions" ADD CONSTRAINT "movie_editions_movie_id_content_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "movie_editions" ADD CONSTRAINT "movie_editions_dj_id_dj_voice_artists_id_fk" FOREIGN KEY ("dj_id") REFERENCES "public"."dj_voice_artists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "series_metadata" ADD CONSTRAINT "series_metadata_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "series_metadata" ADD CONSTRAINT "series_metadata_lead_dj_id_dj_voice_artists_id_fk" FOREIGN KEY ("lead_dj_id") REFERENCES "public"."dj_voice_artists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "seasons" ADD CONSTRAINT "seasons_series_id_content_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "episodes" ADD CONSTRAINT "episodes_dj_id_dj_voice_artists_id_fk" FOREIGN KEY ("dj_id") REFERENCES "public"."dj_voice_artists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "content_countries" ADD CONSTRAINT "content_countries_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "content_countries" ADD CONSTRAINT "content_countries_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "content_review_notes" ADD CONSTRAINT "content_review_notes_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "content_review_notes" ADD CONSTRAINT "content_review_notes_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "content_review_notes" ADD CONSTRAINT "content_review_notes_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "categories_slug_unique_idx" ON "categories" USING btree (lower("slug"));--> statement-breakpoint

CREATE UNIQUE INDEX "categories_name_unique_idx" ON "categories" USING btree (lower("name"));--> statement-breakpoint

CREATE INDEX "categories_is_active_display_order_idx" ON "categories" USING btree ("is_active","display_order");--> statement-breakpoint

CREATE UNIQUE INDEX "countries_code_unique_idx" ON "countries" USING btree (upper("code"));--> statement-breakpoint

CREATE UNIQUE INDEX "countries_name_unique_idx" ON "countries" USING btree (lower("name"));--> statement-breakpoint

CREATE INDEX "countries_is_active_idx" ON "countries" USING btree ("is_active");--> statement-breakpoint

CREATE UNIQUE INDEX "dj_voice_artists_slug_unique_idx" ON "dj_voice_artists" USING btree (lower("slug"));--> statement-breakpoint

CREATE INDEX "dj_voice_artists_stage_name_idx" ON "dj_voice_artists" USING btree ("stage_name");--> statement-breakpoint

CREATE INDEX "dj_voice_artists_is_active_idx" ON "dj_voice_artists" USING btree ("is_active");--> statement-breakpoint

CREATE UNIQUE INDEX "content_slug_unique_idx" ON "content" USING btree (lower("slug"));--> statement-breakpoint

CREATE INDEX "content_status_idx" ON "content" USING btree ("status");--> statement-breakpoint

CREATE INDEX "content_type_status_idx" ON "content" USING btree ("content_type","status");--> statement-breakpoint

CREATE INDEX "content_published_at_idx" ON "content" USING btree ("published_at");--> statement-breakpoint

CREATE INDEX "content_created_by_idx" ON "content" USING btree ("created_by");--> statement-breakpoint

CREATE INDEX "content_assigned_to_idx" ON "content" USING btree ("assigned_to");--> statement-breakpoint

CREATE INDEX "content_is_featured_idx" ON "content" USING btree ("is_featured");--> statement-breakpoint

CREATE INDEX "content_is_trending_idx" ON "content" USING btree ("is_trending");--> statement-breakpoint

CREATE UNIQUE INDEX "movie_editions_movie_dj_unique_idx" ON "movie_editions" USING btree ("movie_id","dj_id");--> statement-breakpoint

CREATE UNIQUE INDEX "movie_editions_single_default_idx" ON "movie_editions" USING btree ("movie_id") WHERE "movie_editions"."is_default" = true;--> statement-breakpoint

CREATE INDEX "movie_editions_movie_id_idx" ON "movie_editions" USING btree ("movie_id");--> statement-breakpoint

CREATE INDEX "movie_editions_dj_id_idx" ON "movie_editions" USING btree ("dj_id");--> statement-breakpoint

CREATE INDEX "movie_editions_availability_idx" ON "movie_editions" USING btree ("is_available");--> statement-breakpoint

CREATE UNIQUE INDEX "seasons_series_season_number_unique_idx" ON "seasons" USING btree ("series_id","season_number");--> statement-breakpoint

CREATE INDEX "seasons_series_id_idx" ON "seasons" USING btree ("series_id");--> statement-breakpoint

CREATE INDEX "seasons_is_active_idx" ON "seasons" USING btree ("is_active");--> statement-breakpoint

CREATE UNIQUE INDEX "episodes_season_episode_number_unique_idx" ON "episodes" USING btree ("season_id","episode_number");--> statement-breakpoint

CREATE INDEX "episodes_season_id_idx" ON "episodes" USING btree ("season_id");--> statement-breakpoint

CREATE INDEX "episodes_dj_id_idx" ON "episodes" USING btree ("dj_id");--> statement-breakpoint

CREATE INDEX "episodes_status_idx" ON "episodes" USING btree ("status");--> statement-breakpoint

CREATE INDEX "episodes_is_available_idx" ON "episodes" USING btree ("is_available");--> statement-breakpoint

CREATE INDEX "content_categories_category_id_idx" ON "content_categories" USING btree ("category_id");--> statement-breakpoint

CREATE INDEX "content_countries_country_id_idx" ON "content_countries" USING btree ("country_id");--> statement-breakpoint

CREATE INDEX "content_review_notes_content_id_idx" ON "content_review_notes" USING btree ("content_id");--> statement-breakpoint

CREATE INDEX "content_review_notes_reviewer_id_idx" ON "content_review_notes" USING btree ("reviewer_id");--> statement-breakpoint

CREATE INDEX "content_review_notes_assigned_to_idx" ON "content_review_notes" USING btree ("assigned_to");