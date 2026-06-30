export * from "./alerts.js";
export * from "./audit.js";
export * from "./catalog.js";
export * from "./data-sources.js";
export * from "./engagement.js";
export * from "./enums.js";
export * from "./offers.js";
export * from "./stores.js";
export * from "./users.js";

import { priceAlerts } from "./alerts.js";
import { adminAuditLogs } from "./audit.js";
import { brands, categories, products, productVariants } from "./catalog.js";
import { dataSources } from "./data-sources.js";
import { clickEvents, favoriteListItems, favoriteLists, notifications } from "./engagement.js";
import { offers, priceSnapshots } from "./offers.js";
import { stores } from "./stores.js";
import { users } from "./users.js";

export const schemaTables = [
  users,
  categories,
  brands,
  products,
  productVariants,
  stores,
  dataSources,
  offers,
  priceSnapshots,
  priceAlerts,
  favoriteLists,
  favoriteListItems,
  notifications,
  clickEvents,
  adminAuditLogs
] as const;
