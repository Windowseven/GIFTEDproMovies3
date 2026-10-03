CREATE TABLE "phase1_migration_probe" (
	"id" serial PRIMARY KEY NOT NULL,
	"marker" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
