CREATE TABLE "app_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"require_approval" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"mcp_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_mcp_token_unique" UNIQUE("mcp_token")
);
--> statement-breakpoint
ALTER TABLE "weight_log" DROP CONSTRAINT "weight_log_logged_on_unique";--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "settings_id_seq" OWNED BY "settings"."id";--> statement-breakpoint
SELECT setval('settings_id_seq', COALESCE((SELECT MAX(id) FROM settings), 0) + 1, false);--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "id" SET DEFAULT nextval('settings_id_seq');--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "weight_log" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_log" ADD CONSTRAINT "weight_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "weight_log" ADD CONSTRAINT "weight_log_user_day" UNIQUE("user_id","logged_on");