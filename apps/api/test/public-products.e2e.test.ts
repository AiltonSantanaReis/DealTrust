import "reflect-metadata";
import {
  productSearchResponseSchema,
  publicProductDetailResponseSchema
} from "@dealtrust/contracts";
import type { Database, SqlClient } from "@dealtrust/db";
import {
  brands,
  categories,
  createDatabaseClient,
  createSqlClient,
  offers,
  priceSnapshots,
  products,
  productVariants,
  runMigrations,
  stores
} from "@dealtrust/db";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const schemaResetLockId = 332_001;

describe.skipIf(!testDatabaseUrl)("public products", () => {
  let app: NestFastifyApplication | undefined;
  let db: Database;
  let sqlClient: SqlClient | undefined;
  let lockAcquired = false;
  const originalEnv = process.env;

  beforeAll(async () => {
    const databaseUrl = requireTestDatabaseUrl(testDatabaseUrl);
    sqlClient = createSqlClient(databaseUrl, {
      max: 1,
      onnotice: () => undefined
    });
    db = createDatabaseClient(sqlClient);

    await acquireSchemaResetLock(requireValue(sqlClient));
    lockAcquired = true;
    await resetPublicSchema(requireValue(sqlClient));
    await runMigrations(db);

    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      API_PORT: "0",
      DATABASE_URL: databaseUrl,
      DATABASE_MAX_CONNECTIONS: "2",
      VALKEY_URL: "redis://localhost:6379",
      AUTH_JWT_SECRET: "test-secret-with-at-least-thirty-two-chars",
      AUTH_ACCESS_TOKEN_TTL_SECONDS: "900"
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (sqlClient) {
      if (lockAcquired) {
        await releaseSchemaResetLock(sqlClient);
      }

      await sqlClient.end({ timeout: 1 });
    }

    process.env = originalEnv;
  });

  it("searches active products and returns detail with active offers and price history", async () => {
    const fixture = await createProductFixture();

    const searchResponse = await injectHttp("GET", "/products?q=Console&limit=10");
    expect(searchResponse.statusCode).toBe(200);

    const search = productSearchResponseSchema.parse(JSON.parse(searchResponse.payload));
    expect(search.items.map((item) => item.id)).toEqual([fixture.activeProductId]);
    expect(search.items[0]?.lowestOffer?.finalPrice.amountCents).toBe(260_00);
    expect(search.items[0]?.offerCount).toBe(2);
    expect(search.items[0]?.inStockOfferCount).toBe(1);

    const ignoredStatusResponse = await injectHttp("GET", "/products?q=Console&status=draft");
    expect(ignoredStatusResponse.statusCode).toBe(200);
    expect(
      productSearchResponseSchema
        .parse(JSON.parse(ignoredStatusResponse.payload))
        .items.map((item) => item.id)
    ).toEqual([fixture.activeProductId]);

    const detailResponse = await injectHttp(
      "GET",
      `/products/${fixture.activeProductId}?historyDays=365&historyLimit=20`
    );
    expect(detailResponse.statusCode).toBe(200);

    const detail = publicProductDetailResponseSchema.parse(JSON.parse(detailResponse.payload));
    expect(detail.id).toBe(fixture.activeProductId);
    expect(detail.brand.name).toBe("Example Electronics");
    expect(detail.category.name).toBe("Electronics");
    expect(detail.variants).toHaveLength(1);
    expect(detail.offers).toHaveLength(2);
    expect(detail.priceHistory).toHaveLength(2);
    expect(detail.priceAnalysis.label).toBe("historical_low");
    expect(detail.priceAnalysis.currentPrice?.amountCents).toBe(260_00);
    expect(detail.priceAnalysis.historicalLow?.amountCents).toBe(290_00);

    const draftDetailResponse = await injectHttp("GET", `/products/${fixture.draftProductId}`);
    expect(draftDetailResponse.statusCode).toBe(404);
  });

  async function createProductFixture() {
    const [category] = await db
      .insert(categories)
      .values({
        name: "Electronics",
        slug: "electronics",
        status: "active"
      })
      .returning({
        id: categories.id
      });

    const [brand] = await db
      .insert(brands)
      .values({
        name: "Example Electronics",
        slug: "example-electronics"
      })
      .returning({
        id: brands.id
      });

    const [activeProduct] = await db
      .insert(products)
      .values({
        categoryId: requireValue(category).id,
        brandId: requireValue(brand).id,
        name: "Demo Console Pro",
        model: "DCP-1000",
        description: "Reference product for public product validation.",
        imageUrl: "https://example.com/products/demo-console-pro.jpg",
        status: "active"
      })
      .returning({
        id: products.id
      });

    const [draftProduct] = await db
      .insert(products)
      .values({
        categoryId: requireValue(category).id,
        brandId: requireValue(brand).id,
        name: "Draft Console",
        status: "draft"
      })
      .returning({
        id: products.id
      });

    const [activeVariant] = await db
      .insert(productVariants)
      .values({
        productId: requireValue(activeProduct).id,
        color: "Black",
        memory: "1 TB",
        status: "active"
      })
      .returning({
        id: productVariants.id
      });

    await db.insert(productVariants).values({
      productId: requireValue(activeProduct).id,
      color: "White",
      status: "draft"
    });

    const [activeStore] = await db
      .insert(stores)
      .values({
        name: "Example Retail",
        domain: "shop.example.com",
        reputationScore: 82,
        status: "active",
        type: "retailer"
      })
      .returning({
        id: stores.id
      });

    const [blockedStore] = await db
      .insert(stores)
      .values({
        name: "Blocked Retail",
        domain: "blocked.example.com",
        reputationScore: 10,
        status: "blocked",
        type: "retailer"
      })
      .returning({
        id: stores.id
      });

    const [lowestOffer] = await db
      .insert(offers)
      .values({
        productVariantId: requireValue(activeVariant).id,
        storeId: requireValue(activeStore).id,
        url: "https://shop.example.com/demo-console-pro",
        currentPriceCents: 250_00,
        shippingCents: 10_00,
        currency: "BRL",
        inStock: true,
        status: "active",
        lastSeenAt: daysAgo(1)
      })
      .returning({
        id: offers.id
      });

    await db.insert(offers).values({
      productVariantId: requireValue(activeVariant).id,
      storeId: requireValue(activeStore).id,
      url: "https://shop.example.com/demo-console-pro-bundle",
      currentPriceCents: 240_00,
      shippingCents: 30_00,
      currency: "BRL",
      inStock: false,
      status: "active",
      lastSeenAt: daysAgo(1)
    });

    await db.insert(offers).values({
      productVariantId: requireValue(activeVariant).id,
      storeId: requireValue(blockedStore).id,
      url: "https://blocked.example.com/demo-console-pro",
      currentPriceCents: 100_00,
      shippingCents: 0,
      currency: "BRL",
      inStock: true,
      status: "active"
    });

    await db.insert(priceSnapshots).values([
      {
        offerId: requireValue(lowestOffer).id,
        priceCents: 300_00,
        shippingCents: 0,
        currency: "BRL",
        available: true,
        capturedAt: daysAgo(20)
      },
      {
        offerId: requireValue(lowestOffer).id,
        priceCents: 290_00,
        shippingCents: 0,
        currency: "BRL",
        available: true,
        capturedAt: daysAgo(10)
      }
    ]);

    return {
      activeProductId: requireValue(activeProduct).id,
      draftProductId: requireValue(draftProduct).id
    };
  }

  async function injectHttp(method: "GET", url: string) {
    return requireValue(app).getHttpAdapter().getInstance().inject({
      method,
      url
    });
  }
});

async function acquireSchemaResetLock(sqlClient: SqlClient): Promise<void> {
  await sqlClient`select pg_advisory_lock(${schemaResetLockId})`;
}

async function releaseSchemaResetLock(sqlClient: SqlClient): Promise<void> {
  await sqlClient`select pg_advisory_unlock(${schemaResetLockId})`;
}

async function resetPublicSchema(sqlClient: SqlClient): Promise<void> {
  await sqlClient`drop schema if exists drizzle cascade`;
  await sqlClient`drop schema if exists public cascade`;
  await sqlClient`create schema public`;
}

function requireTestDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for public product integration tests.");
  }

  const parsedUrl = new URL(databaseUrl);

  if (!parsedUrl.pathname.endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL must point to a database whose name ends with _test.");
  }

  return databaseUrl;
}

function requireValue<T>(value: T | undefined): T {
  if (!value) {
    throw new Error("Expected value.");
  }

  return value;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
