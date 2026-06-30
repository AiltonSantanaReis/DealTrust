import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { productVariants } from "./catalog.js";
import { idColumn, lifecycleColumns } from "./common.js";
import { dataSources } from "./data-sources.js";
import { offerStatusEnum } from "./enums.js";
import { stores } from "./stores.js";

export const offers = pgTable(
  "offers",
  {
    id: idColumn(),
    productVariantId: uuid("product_variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "restrict" }),
    dataSourceId: uuid("data_source_id").references(() => dataSources.id, {
      onDelete: "set null"
    }),
    url: text("url").notNull(),
    currentPriceCents: integer("current_price_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
    inStock: boolean("in_stock").notNull().default(true),
    status: offerStatusEnum("status").notNull().default("active"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...lifecycleColumns()
  },
  (table) => [
    index("offers_product_variant_id_idx").on(table.productVariantId),
    index("offers_store_id_idx").on(table.storeId),
    index("offers_status_idx").on(table.status),
    check("offers_current_price_cents_non_negative", sql`${table.currentPriceCents} >= 0`),
    check("offers_shipping_cents_non_negative", sql`${table.shippingCents} >= 0`)
  ]
);

export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: idColumn(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    couponCode: varchar("coupon_code", { length: 80 }),
    couponDiscountCents: integer("coupon_discount_cents").notNull().default(0),
    confirmedCashbackCents: integer("confirmed_cashback_cents").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
    available: boolean("available").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull()
  },
  (table) => [
    index("price_snapshots_offer_id_idx").on(table.offerId),
    index("price_snapshots_offer_captured_at_idx").on(table.offerId, table.capturedAt),
    index("price_snapshots_captured_at_idx").on(table.capturedAt),
    check("price_snapshots_price_cents_non_negative", sql`${table.priceCents} >= 0`),
    check("price_snapshots_shipping_cents_non_negative", sql`${table.shippingCents} >= 0`),
    check(
      "price_snapshots_coupon_discount_cents_non_negative",
      sql`${table.couponDiscountCents} >= 0`
    ),
    check(
      "price_snapshots_confirmed_cashback_cents_non_negative",
      sql`${table.confirmedCashbackCents} >= 0`
    )
  ]
);
