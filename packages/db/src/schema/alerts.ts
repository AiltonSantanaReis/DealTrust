import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { productVariants } from "./catalog.js";
import { idColumn, lifecycleColumns } from "./common.js";
import { priceAlertStatusEnum, priceAlertTypeEnum } from "./enums.js";
import { users } from "./users.js";

export const priceAlerts = pgTable(
  "price_alerts",
  {
    id: idColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productVariantId: uuid("product_variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    type: priceAlertTypeEnum("type").notNull(),
    targetPriceCents: integer("target_price_cents"),
    dropPercent: integer("drop_percent"),
    currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
    status: priceAlertStatusEnum("status").notNull().default("active"),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
    ...lifecycleColumns()
  },
  (table) => [
    index("price_alerts_user_id_idx").on(table.userId),
    index("price_alerts_product_variant_id_idx").on(table.productVariantId),
    index("price_alerts_status_idx").on(table.status),
    check(
      "price_alerts_target_price_cents_non_negative",
      sql`${table.targetPriceCents} is null or ${table.targetPriceCents} >= 0`
    ),
    check(
      "price_alerts_drop_percent_range",
      sql`${table.dropPercent} is null or (${table.dropPercent} >= 1 and ${table.dropPercent} <= 90)`
    )
  ]
);
