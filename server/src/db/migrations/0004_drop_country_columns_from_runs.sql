ALTER TABLE "runs" DROP CONSTRAINT "runs_left_country_id_countries_id_fk";
--> statement-breakpoint
ALTER TABLE "runs" DROP CONSTRAINT "runs_right_country_id_countries_id_fk";
--> statement-breakpoint
ALTER TABLE "runs" ALTER COLUMN "category_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ALTER COLUMN "left_item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ALTER COLUMN "right_item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" DROP COLUMN "left_country_id";--> statement-breakpoint
ALTER TABLE "runs" DROP COLUMN "right_country_id";