import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { index, pgTable, text, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { idColumn, lifecycleColumns } from "./common.js";
import { productStatusEnum } from "./enums.js";

export const categories = pgTable(
  "categories",
  {
    id: idColumn(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null"
    }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    status: productStatusEnum("status").notNull().default("active"),
    ...lifecycleColumns()
  },
  (table) => [
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_parent_id_idx").on(table.parentId),
    index("categories_status_idx").on(table.status)
  ]
);

export const brands = pgTable(
  "brands",
  {
    id: idColumn(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    ...lifecycleColumns()
  },
  (table) => [uniqueIndex("brands_slug_unique").on(table.slug)]
);

export const products = pgTable(
  "products",
  {
    id: idColumn(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 180 }).notNull(),
    model: varchar("model", { length: 120 }),
    description: text("description"),
    imageUrl: text("image_url"),
    status: productStatusEnum("status").notNull().default("draft"),
    ...lifecycleColumns()
  },
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    index("products_brand_id_idx").on(table.brandId),
    index("products_status_idx").on(table.status)
  ]
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: idColumn(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    color: varchar("color", { length: 80 }),
    voltage: varchar("voltage", { length: 20 }),
    memory: varchar("memory", { length: 80 }),
    size: varchar("size", { length: 80 }),
    edition: varchar("edition", { length: 120 }),
    status: productStatusEnum("status").notNull().default("active"),
    ...lifecycleColumns()
  },
  (table) => [
    index("product_variants_product_id_idx").on(table.productId),
    index("product_variants_status_idx").on(table.status)
  ]
);
