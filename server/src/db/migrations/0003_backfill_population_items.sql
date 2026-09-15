-- Custom SQL migration file, put your code below! --
INSERT INTO "categories" ("slug","name","unit","description") VALUES ('population','Country population','people','Which country has the bigger population?') ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
INSERT INTO "items" ("category_id","name","value") SELECT cat.id, c."name", c."population" FROM "countries" c CROSS JOIN (SELECT id FROM "categories" WHERE slug='population') cat WHERE NOT EXISTS (SELECT 1 FROM "items" i WHERE i.category_id=cat.id AND i."name"=c."name");
--> statement-breakpoint
UPDATE "runs" r SET category_id=cat.id, left_item_id=li.id, right_item_id=ri.id FROM (SELECT id FROM "categories" WHERE slug='population') cat, "countries" lc, "countries" rc, "items" li, "items" ri WHERE lc.id=r.left_country_id AND rc.id=r.right_country_id AND li.category_id=cat.id AND li."name"=lc."name" AND ri.category_id=cat.id AND ri."name"=rc."name";
--> statement-breakpoint
DELETE FROM "runs" WHERE category_id IS NULL OR left_item_id IS NULL OR right_item_id IS NULL;
