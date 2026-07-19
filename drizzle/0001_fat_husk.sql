CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"performed_on" date NOT NULL,
	"name" text NOT NULL,
	"duration_min" real,
	"kcal" real NOT NULL,
	"met" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
