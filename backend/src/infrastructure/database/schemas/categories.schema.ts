import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const categoriesTable = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("categories_slug_unique_idx").on(sql`lower(${table.slug})`),
    uniqueIndex("categories_name_unique_idx").on(sql`lower(${table.name})`),
    index("categories_is_active_display_order_idx").on(table.isActive, table.displayOrder),
  ],
);

export type CategoryRecord = typeof categoriesTable.$inferSelect;
export type NewCategoryRecord = typeof categoriesTable.$inferInsert;
