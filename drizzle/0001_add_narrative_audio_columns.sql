-- Add narrative and audio columns to digests table
ALTER TABLE "digests" ADD COLUMN IF NOT EXISTS "narrative_thread" text;
ALTER TABLE "digests" ADD COLUMN IF NOT EXISTS "opening" text;
ALTER TABLE "digests" ADD COLUMN IF NOT EXISTS "closing" text;
ALTER TABLE "digests" ADD COLUMN IF NOT EXISTS "audio_url" text;

-- Add fun_activities to user_preferences if not exists
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "fun_activities" text[] DEFAULT '{}';

-- Add content_feedback table if not exists
CREATE TABLE IF NOT EXISTS "content_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"digest_item_id" uuid NOT NULL REFERENCES "digest_items"("id") ON DELETE cascade,
	"feedback_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add favorite_articles table if not exists
CREATE TABLE IF NOT EXISTS "favorite_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"digest_item_id" uuid NOT NULL REFERENCES "digest_items"("id") ON DELETE cascade,
	"created_at" timestamp DEFAULT now() NOT NULL
);
