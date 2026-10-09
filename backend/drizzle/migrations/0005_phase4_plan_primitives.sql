CREATE TYPE "public"."commercial_target_kind" AS ENUM('MOVIE', 'SERIES', 'SEASON', 'EPISODE', 'CATALOG');--> statement-breakpoint
CREATE TYPE "public"."commercial_policy_type" AS ENUM('ALL_CATALOG', 'CATEGORY_SET', 'CONTENT_SET');--> statement-breakpoint
CREATE TYPE "public"."duration_unit" AS ENUM('HOUR', 'DAY');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('draft', 'active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING_PAYMENT', 'PAID', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_attempt_status" AS ENUM('PENDING', 'UNKNOWN', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED_RETRYABLE', 'FAILED_TERMINAL');--> statement-breakpoint
CREATE TYPE "public"."entitlement_status" AS ENUM('ACTIVE', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."entitlement_effect_kind" AS ENUM('CREATED', 'EXTENDED');--> statement-breakpoint
CREATE TYPE "public"."download_limit_type" AS ENUM('UNIQUE_TITLES', 'DOWNLOAD_ACTIONS');--> statement-breakpoint

CREATE TABLE "access_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint

CREATE TABLE "plan_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"access_plan_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"duration_value" integer NOT NULL,
	"duration_unit" "duration_unit" NOT NULL,
	"download_limit" integer,
	"download_limit_type" "download_limit_type",
	"device_limit" integer,
	"concurrent_stream_limit" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_versions_access_plan_version_unique" UNIQUE("access_plan_id", "version_number"),
	CONSTRAINT "plan_versions_version_number_check" CHECK ("version_number" > 0),
	CONSTRAINT "plan_versions_duration_value_check" CHECK ("duration_value" > 0),
	CONSTRAINT "plan_versions_download_limit_check" CHECK ("download_limit" IS NULL OR "download_limit" >= 0),
	CONSTRAINT "plan_versions_device_limit_check" CHECK ("device_limit" IS NULL OR "device_limit" >= 0),
	CONSTRAINT "plan_versions_concurrent_stream_limit_check" CHECK ("concurrent_stream_limit" IS NULL OR "concurrent_stream_limit" > 0)
);
--> statement-breakpoint

ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_access_plan_id_access_plans_id_fk" FOREIGN KEY ("access_plan_id") REFERENCES "public"."access_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "plan_versions_access_plan_id_idx" ON "plan_versions" USING btree ("access_plan_id");
