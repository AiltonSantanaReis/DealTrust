import { index, pgTable, primaryKey, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { productVariants } from "./catalog.js";
import { idColumn, lifecycleColumns } from "./common.js";
import {
  favoriteListVisibilityEnum,
  notificationChannelEnum,
  notificationStatusEnum
} from "./enums.js";
import { offers } from "./offers.js";
import { users } from "./users.js";

export const favoriteLists = pgTable(
  "favorite_lists",
  {
    id: idColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    visibility: favoriteListVisibilityEnum("visibility").notNull().default("private"),
    ...lifecycleColumns()
  },
  (table) => [index("favorite_lists_user_id_idx").on(table.userId)]
);

export const favoriteListItems = pgTable(
  "favorite_list_items",
  {
    favoriteListId: uuid("favorite_list_id")
      .notNull()
      .references(() => favoriteLists.id, { onDelete: "cascade" }),
    productVariantId: uuid("product_variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({
      columns: [table.favoriteListId, table.productVariantId],
      name: "favorite_list_items_pk"
    }),
    index("favorite_list_items_product_variant_id_idx").on(table.productVariantId)
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: idColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body").notNull(),
    status: notificationStatusEnum("status").notNull().default("pending"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...lifecycleColumns()
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_status_idx").on(table.status)
  ]
);

export const clickEvents = pgTable(
  "click_events",
  {
    id: idColumn(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    origin: varchar("origin", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("click_events_offer_id_idx").on(table.offerId),
    index("click_events_created_at_idx").on(table.createdAt)
  ]
);
