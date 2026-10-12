ALTER TABLE "users" ADD COLUMN "apple_sub" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "apple_refresh_token" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "users_apple_sub_unique_idx" ON "users" ("apple_sub");
