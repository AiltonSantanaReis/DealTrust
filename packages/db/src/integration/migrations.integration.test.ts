import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseClient, createSqlClient, type Database, type SqlClient } from "../client.js";
import { runMigrations } from "../migrations.js";
import {
  brands,
  categories,
  offers,
  priceAlerts,
  priceSnapshots,
  products,
  productVariants,
  stores,
  users
} from "../schema/index.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const schemaResetLockId = 332_001;

describe.skipIf(!testDatabaseUrl)("database migrations integration", () => {
  let sqlClient: SqlClient | undefined;
  let db: Database;
  let lockAcquired = false;

  beforeAll(async () => {
    const databaseUrl = requireTestDatabaseUrl(testDatabaseUrl);
    sqlClient = createSqlClient(databaseUrl, {
      max: 1,
      onnotice: () => undefined
    });
    db = createDatabaseClient(sqlClient);

    await acquireSchemaResetLock();
    lockAcquired = true;
    await resetPublicSchema();
    await runMigrations(db);
  });

  afterAll(async () => {
    if (sqlClient) {
      if (lockAcquired) {
        await releaseSchemaResetLock();
      }

      await sqlClient.end({ timeout: 1 });
    }
  });

  it("applies migrations and persists the core product pricing flow", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Integration User",
        email: "integration@example.com",
        passwordHash: "argon2id:test-hash",
        status: "active"
      })
      .returning();

    const [category] = await db
      .insert(categories)
      .values({
        name: "Games",
        slug: "games"
      })
      .returning();

    const [brand] = await db
      .insert(brands)
      .values({
        name: "Sony",
        slug: "sony"
      })
      .returning();

    const [product] = await db
      .insert(products)
      .values({
        categoryId: requireValue(category).id,
        brandId: requireValue(brand).id,
        name: "PlayStation 5",
        model: "CFI-1214A",
        status: "active"
      })
      .returning();

    const [variant] = await db
      .insert(productVariants)
      .values({
        productId: requireValue(product).id,
        edition: "Standard",
        status: "active"
      })
      .returning();

    const [store] = await db
      .insert(stores)
      .values({
        name: "Example Store",
        domain: "example.com",
        reputationScore: 82,
        status: "active"
      })
      .returning();

    const [offer] = await db
      .insert(offers)
      .values({
        productVariantId: requireValue(variant).id,
        storeId: requireValue(store).id,
        url: "https://example.com/playstation-5",
        currentPriceCents: 349_900,
        shippingCents: 1_990,
        inStock: true,
        status: "active"
      })
      .returning();

    await db.insert(priceSnapshots).values({
      offerId: requireValue(offer).id,
      priceCents: 349_900,
      shippingCents: 1_990,
      available: true,
      capturedAt: new Date("2026-06-30T12:00:00.000Z")
    });

    await db.insert(priceAlerts).values({
      userId: requireValue(user).id,
      productVariantId: requireValue(variant).id,
      type: "target_price",
      targetPriceCents: 329_900,
      status: "active"
    });

    const snapshots = await db
      .select()
      .from(priceSnapshots)
      .where(eq(priceSnapshots.offerId, requireValue(offer).id));

    const alerts = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.userId, requireValue(user).id));

    expect(snapshots).toHaveLength(1);
    expect(firstRow(snapshots).priceCents).toBe(349_900);
    expect(alerts).toHaveLength(1);
    expect(firstRow(alerts).targetPriceCents).toBe(329_900);
  });

  async function resetPublicSchema(): Promise<void> {
    const client = requireValue(sqlClient);

    await client`drop schema if exists drizzle cascade`;
    await client`drop schema if exists public cascade`;
    await client`create schema public`;
  }

  async function acquireSchemaResetLock(): Promise<void> {
    const client = requireValue(sqlClient);

    await client`select pg_advisory_lock(${schemaResetLockId})`;
  }

  async function releaseSchemaResetLock(): Promise<void> {
    const client = requireValue(sqlClient);

    await client`select pg_advisory_unlock(${schemaResetLockId})`;
  }
});

function requireTestDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for database integration tests.");
  }

  const parsedUrl = new URL(databaseUrl);

  if (!parsedUrl.pathname.endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL must point to a database whose name ends with _test.");
  }

  return databaseUrl;
}

function firstRow<T>(rows: readonly T[]): T {
  const row = rows.at(0);

  if (!row) {
    throw new Error("Expected at least one row.");
  }

  return row;
}

function requireValue<T>(value: T | undefined): T {
  if (!value) {
    throw new Error("Expected value.");
  }

  return value;
}
