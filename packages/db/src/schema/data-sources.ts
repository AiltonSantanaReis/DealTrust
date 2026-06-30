import { index, pgTable, varchar } from "drizzle-orm/pg-core";
import { idColumn, lifecycleColumns } from "./common.js";
import { dataSourceTypeEnum, storeStatusEnum } from "./enums.js";

export const dataSources = pgTable(
  "data_sources",
  {
    id: idColumn(),
    name: varchar("name", { length: 120 }).notNull(),
    type: dataSourceTypeEnum("type").notNull(),
    status: storeStatusEnum("status").notNull().default("active"),
    ...lifecycleColumns()
  },
  (table) => [index("data_sources_type_idx").on(table.type)]
);
