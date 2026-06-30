import { pgEnum } from "drizzle-orm/pg-core";

export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete", "block"]);

export const dataSourceTypeEnum = pgEnum("data_source_type", [
  "manual",
  "feed",
  "api",
  "affiliate",
  "collector"
]);

export const favoriteListVisibilityEnum = pgEnum("favorite_list_visibility", ["private", "shared"]);

export const notificationChannelEnum = pgEnum("notification_channel", ["email", "push"]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
  "canceled"
]);

export const offerStatusEnum = pgEnum("offer_status", [
  "active",
  "out_of_stock",
  "blocked",
  "expired"
]);

export const priceAlertStatusEnum = pgEnum("price_alert_status", [
  "active",
  "paused",
  "triggered",
  "canceled"
]);

export const priceAlertTypeEnum = pgEnum("price_alert_type", [
  "target_price",
  "drop_percent",
  "historical_low"
]);

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "active",
  "blocked",
  "archived"
]);

export const storeStatusEnum = pgEnum("store_status", [
  "pending_review",
  "active",
  "blocked",
  "archived"
]);

export const storeTypeEnum = pgEnum("store_type", ["marketplace", "retailer", "direct"]);

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "owner"]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "pending_verification",
  "blocked",
  "deleted"
]);
