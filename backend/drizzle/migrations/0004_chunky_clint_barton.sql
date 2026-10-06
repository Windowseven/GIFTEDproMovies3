ALTER TABLE "dj_voice_artists" DROP COLUMN "tier";--> statement-breakpoint
ALTER TABLE "dj_voice_artists" DROP COLUMN "contract_type";--> statement-breakpoint
ALTER TABLE "series_metadata" DROP COLUMN "pricing_model";--> statement-breakpoint
DROP TYPE "public"."pricing_model";