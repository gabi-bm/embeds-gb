import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  unit: text('unit').notNull(),
  description: text('description'),
})

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id),
  name: text('name').notNull(),
  value: numeric('value', { mode: 'bigint' }).notNull(),
})

export const runStatus = ['active', 'ended'] as const
export type RunStatus = (typeof runStatus)[number]

export const runs = pgTable('runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id),
  leftItemId: integer('left_item_id')
    .notNull()
    .references(() => items.id),
  rightItemId: integer('right_item_id')
    .notNull()
    .references(() => items.id),
  streak: integer('streak').notNull().default(0),
  bestStreak: integer('best_streak').notNull().default(0),
  status: text('status', { enum: runStatus }).notNull().default('active'),
  nickname: text('nickname'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
