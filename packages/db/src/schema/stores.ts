import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { idColumn, lifecycleColumns } from "./common.js";
import { storeStatusEnum, storeTypeEnum } from "./enums.js";

export const stores = pgTable(
  "stores",
  {
    id: idColumn(),
    name: varchar("name", { length: 120 }).notNull(),
    domain: varchar("domain", { length: 253 }).notNull(),
    reputationScore: integer("reputation_score").notNull().default(0),
    status: storeStatusEnum("status").notNull().default("pending_review"),
    type: storeTypeEnum("type").notNull().default("retailer"),
    ...lifecycleColumns()
  },
  (table) => [
    uniqueIndex("stores_domain_unique").on(table.domain),
    index("stores_status_idx").on(table.status),
    check("stores_reputation_score_range", sql`${table.reputationScore} between 0 and 100`)
  ]
);
