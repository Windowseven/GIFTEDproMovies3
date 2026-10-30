CREATE TABLE "media_asset_supersessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_kind" varchar(32) NOT NULL,
	"target_id" uuid NOT NULL,
	"superseded_by_actor_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"file_type" varchar(32) NOT NULL,
	"previous_streaming_file_key" text,
	"previous_download_file_key" text,
	"new_streaming_file_key" text,
	"new_download_file_key" text,
	"superseded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "media_asset_supersessions" ADD CONSTRAINT "media_asset_supersessions_actor_fk" FOREIGN KEY ("superseded_by_actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "media_asset_supersessions_target_idx" ON "media_asset_supersessions" USING btree ("target_id");
--> statement-breakpoint
CREATE INDEX "media_asset_supersessions_actor_idx" ON "media_asset_supersessions" USING btree ("superseded_by_actor_id");
--> statement-breakpoint
CREATE INDEX "media_asset_supersessions_created_idx" ON "media_asset_supersessions" USING btree ("created_at");
--> statement-breakpoint

CREATE OR REPLACE FUNCTION check_movie_edition_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- If streaming_status or download_status was 'ready' and file keys are modified
  IF (OLD.streaming_status = 'ready' OR OLD.download_status = 'ready') THEN
    IF (OLD.streaming_file_key IS NOT NULL AND NEW.streaming_file_key IS DISTINCT FROM OLD.streaming_file_key)
       OR (OLD.download_file_key IS NOT NULL AND NEW.download_file_key IS DISTINCT FROM OLD.download_file_key) THEN
      -- Check if active commercial entitlements reference this movie
      IF EXISTS (
        SELECT 1 FROM entitlements e
        WHERE e.target_movie_content_id = OLD.movie_id
          AND e.status = 'ACTIVE'
      ) THEN
        -- Allow mutation ONLY if a corresponding record in media_asset_supersessions was registered
        IF NOT EXISTS (
          SELECT 1 FROM media_asset_supersessions s
          WHERE s.target_id = OLD.id
            AND s.created_at >= (NOW() - INTERVAL '60 seconds')
        ) THEN
          RAISE EXCEPTION 'DIRECT_SQL_MUTATION_DENIED: Cannot mutate ready media asset with active commercial entitlements without registering media_asset_supersessions';
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION check_episode_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- If streaming_status or download_status was 'ready' and file keys are modified
  IF (OLD.streaming_status = 'ready' OR OLD.download_status = 'ready') THEN
    IF (OLD.streaming_file_key IS NOT NULL AND NEW.streaming_file_key IS DISTINCT FROM OLD.streaming_file_key)
       OR (OLD.download_file_key IS NOT NULL AND NEW.download_file_key IS DISTINCT FROM OLD.download_file_key) THEN
      -- Check if active commercial entitlements reference this episode, its season, or series
      IF EXISTS (
        SELECT 1 FROM entitlements e
        JOIN seasons s ON s.id = OLD.season_id
        WHERE (
          e.target_episode_id = OLD.id
          OR e.target_season_id = OLD.season_id
          OR e.target_series_content_id = s.series_id
        )
        AND e.status = 'ACTIVE'
      ) THEN
        -- Allow mutation ONLY if a corresponding record in media_asset_supersessions was registered
        IF NOT EXISTS (
          SELECT 1 FROM media_asset_supersessions s
          WHERE s.target_id = OLD.id
            AND s.created_at >= (NOW() - INTERVAL '60 seconds')
        ) THEN
          RAISE EXCEPTION 'DIRECT_SQL_MUTATION_DENIED: Cannot mutate ready media asset with active commercial entitlements without registering media_asset_supersessions';
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER trg_movie_editions_supersession_guard
BEFORE UPDATE ON movie_editions
FOR EACH ROW
EXECUTE FUNCTION check_movie_edition_immutability();
--> statement-breakpoint

CREATE TRIGGER trg_episodes_supersession_guard
BEFORE UPDATE ON episodes
FOR EACH ROW
EXECUTE FUNCTION check_episode_immutability();
--> statement-breakpoint

CREATE TABLE "download_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"plan_version_id" uuid NOT NULL,
	"content_kind" varchar(32) NOT NULL,
	"content_id" uuid NOT NULL,
	"edition_id" uuid,
	"episode_id" uuid,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"download_token" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"retry_grace_expires_at" timestamp with time zone NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"failure_reason" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "download_attempts" ADD CONSTRAINT "download_attempts_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "download_attempts" ADD CONSTRAINT "download_attempts_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "download_attempts" ADD CONSTRAINT "download_attempts_entitlement_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."entitlements"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "download_attempts" ADD CONSTRAINT "download_attempts_plan_version_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "download_attempts" ADD CONSTRAINT "download_attempts_edition_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."movie_editions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "download_attempts" ADD CONSTRAINT "download_attempts_episode_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "download_attempts_customer_order_idx" ON "download_attempts" USING btree ("customer_id", "order_id");
--> statement-breakpoint
CREATE INDEX "download_attempts_content_idx" ON "download_attempts" USING btree ("content_id");
--> statement-breakpoint
CREATE INDEX "download_attempts_status_idx" ON "download_attempts" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "download_attempts_retry_grace_idx" ON "download_attempts" USING btree ("retry_grace_expires_at");
