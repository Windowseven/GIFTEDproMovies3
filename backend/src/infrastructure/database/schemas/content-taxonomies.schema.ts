import { index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { contentTable } from "./content.schema.js";
import { categoriesTable } from "./categories.schema.js";
import { countriesTable } from "./countries.schema.js";

export const contentCategoriesTable = pgTable(
  "content_categories",
  {
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentTable.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categoriesTable.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.contentId, table.categoryId] }),
    index("content_categories_category_id_idx").on(table.categoryId),
  ],
);

export const contentCountriesTable = pgTable(
  "content_countries",
  {
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentTable.id, { onDelete: "cascade" }),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countriesTable.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.contentId, table.countryId] }),
    index("content_countries_country_id_idx").on(table.countryId),
  ],
);

export type ContentCategoryRecord = typeof contentCategoriesTable.$inferSelect;
export type NewContentCategoryRecord = typeof contentCategoriesTable.$inferInsert;

export type ContentCountryRecord = typeof contentCountriesTable.$inferSelect;
export type NewContentCountryRecord = typeof contentCountriesTable.$inferInsert;
