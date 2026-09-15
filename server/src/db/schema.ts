import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const countries = pgTable('countries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  population: integer('population').notNull(),
})

export const runStatus = ['active', 'ended'] as const
export type RunStatus = (typeof runStatus)[number]

export const runs = pgTable('runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  leftCountryId: integer('left_country_id')
    .notNull()
    .references(() => countries.id),
  rightCountryId: integer('right_country_id')
    .notNull()
    .references(() => countries.id),
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
