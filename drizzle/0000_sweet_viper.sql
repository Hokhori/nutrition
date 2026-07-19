CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumed_on" date NOT NULL,
	"food_id" integer,
	"label" text,
	"quantity_g" real NOT NULL,
	"meal" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"barcode" text,
	"kcal" real NOT NULL,
	"protein_g" real DEFAULT 0 NOT NULL,
	"carbs_g" real DEFAULT 0 NOT NULL,
	"sugars_g" real DEFAULT 0 NOT NULL,
	"fat_g" real DEFAULT 0 NOT NULL,
	"saturated_g" real DEFAULT 0 NOT NULL,
	"fiber_g" real DEFAULT 0 NOT NULL,
	"salt_g" real DEFAULT 0 NOT NULL,
	"serving_size_g" real,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "foods_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"sex" text,
	"birth_year" integer,
	"height_cm" real,
	"activity_level" text DEFAULT 'sedentary' NOT NULL,
	"target_weight_kg" real,
	"weekly_rate_kg" real DEFAULT 0.5 NOT NULL,
	"manual_kcal_target" real,
	"protein_target_g" real,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"logged_on" date NOT NULL,
	"weight_kg" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weight_log_logged_on_unique" UNIQUE("logged_on")
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;