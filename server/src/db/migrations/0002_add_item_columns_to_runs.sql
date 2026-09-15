ALTER TABLE "runs" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "left_item_id" integer;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "right_item_id" integer;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_left_item_id_items_id_fk" FOREIGN KEY ("left_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_right_item_id_items_id_fk" FOREIGN KEY ("right_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;