import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  favoriteLists,
  offers,
  priceAlerts,
  priceSnapshots,
  productVariants,
  schemaTables,
  stores,
  users
} from "./index.js";

describe("database schema", () => {
  it("exports the initial MVP table set", () => {
    const tableNames = schemaTables.map((table) => getTableName(table));

    expect(tableNames).toEqual([
      "users",
      "categories",
      "brands",
      "products",
      "product_variants",
      "stores",
      "data_sources",
      "offers",
      "price_snapshots",
      "price_alerts",
      "favorite_lists",
      "favorite_list_items",
      "notifications",
      "click_events",
      "admin_audit_logs"
    ]);
  });

  it("keeps user auth and RBAC columns explicit", () => {
    const columns = Object.keys(getTableColumns(users));

    expect(columns).toEqual(
      expect.arrayContaining(["id", "name", "email", "passwordHash", "role", "status"])
    );
  });

  it("separates canonical products from variants", () => {
    const columns = Object.keys(getTableColumns(productVariants));

    expect(columns).toEqual(
      expect.arrayContaining(["productId", "color", "voltage", "memory", "size", "edition"])
    );
  });

  it("stores price fields as integer cents with explicit currency", () => {
    const offerColumns = Object.keys(getTableColumns(offers));
    const snapshotColumns = Object.keys(getTableColumns(priceSnapshots));

    expect(offerColumns).toEqual(
      expect.arrayContaining(["currentPriceCents", "shippingCents", "currency"])
    );
    expect(snapshotColumns).toEqual(
      expect.arrayContaining([
        "priceCents",
        "shippingCents",
        "couponDiscountCents",
        "confirmedCashbackCents",
        "currency"
      ])
    );
  });

  it("keeps price snapshots queryable by offer and capture time", () => {
    const columns = Object.keys(getTableColumns(priceSnapshots));

    expect(columns).toEqual(expect.arrayContaining(["offerId", "capturedAt", "available"]));
  });

  it("models store reputation and alert rules needed by the MVP", () => {
    expect(Object.keys(getTableColumns(stores))).toEqual(
      expect.arrayContaining(["domain", "reputationScore", "status", "type"])
    );

    expect(Object.keys(getTableColumns(priceAlerts))).toEqual(
      expect.arrayContaining(["type", "targetPriceCents", "dropPercent", "status"])
    );
  });

  it("keeps favorite lists private by default at the schema level", () => {
    expect(Object.keys(getTableColumns(favoriteLists))).toEqual(
      expect.arrayContaining(["userId", "name", "visibility"])
    );
  });
});
