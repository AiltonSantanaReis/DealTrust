import "reflect-metadata";
import {
  adminAuditLogListResponseSchema,
  adminOfferListResponseSchema,
  adminOfferResponseSchema,
  adminPriceSnapshotListResponseSchema,
  adminPriceSnapshotResponseSchema,
  adminProductVariantListResponseSchema,
  adminProductVariantResponseSchema,
  adminStoreListResponseSchema,
  adminStoreResponseSchema,
  authSessionSchema
} from "@dealtrust/contracts";
import type { Database, SqlClient } from "@dealtrust/db";
import {
  brands,
  categories,
  createDatabaseClient,
  createSqlClient,
  products,
  runMigrations,
  users
} from "@dealtrust/db";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const authJwtSecret = "test-secret-with-at-least-thirty-two-chars";
const schemaResetLockId = 332_001;

describe.skipIf(!testDatabaseUrl)("admin commerce operations", () => {
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
      AUTH_JWT_SECRET: authJwtSecret,
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

  it("manages variants, stores, offers, snapshots and complete audit logs", async () => {
    const anonymousResponse = await injectHttp("GET", "/admin/product-variants");
    expect(anonymousResponse.statusCode).toBe(401);

    const userSession = await registerUser("commerce.user@example.com");
    const forbiddenResponse = await injectHttp(
      "GET",
      "/admin/product-variants",
      userSession.accessToken
    );
    expect(forbiddenResponse.statusCode).toBe(403);

    const ownerSession = await registerUser("commerce.owner@example.com");
    await promoteUserRole(ownerSession.user.id, "owner");

    const product = await createProductFixture();
    const missingId = "53cf458e-8c72-48f4-bcd4-9b4a8d649c7c";

    const invalidVariantResponse = await injectJson(
      "POST",
      "/admin/product-variants",
      ownerSession.accessToken,
      {
        productId: missingId,
        color: "Black"
      }
    );
    expect(invalidVariantResponse.statusCode).toBe(400);

    const createVariantResponse = await injectJson(
      "POST",
      "/admin/product-variants",
      ownerSession.accessToken,
      {
        productId: product.id,
        color: "Black",
        voltage: "bivolt",
        memory: "1 TB"
      }
    );
    expect(createVariantResponse.statusCode).toBe(201);

    const variant = adminProductVariantResponseSchema.parse(
      JSON.parse(createVariantResponse.payload)
    );
    expect(variant.productId).toBe(product.id);
    expect(variant.status).toBe("active");

    const variantListResponse = await injectHttp(
      "GET",
      `/admin/product-variants?productId=${product.id}`,
      ownerSession.accessToken
    );
    expect(variantListResponse.statusCode).toBe(200);
    expect(
      adminProductVariantListResponseSchema
        .parse(JSON.parse(variantListResponse.payload))
        .items.map((item) => item.id)
    ).toContain(variant.id);

    const updateVariantResponse = await injectJson(
      "PATCH",
      `/admin/product-variants/${variant.id}`,
      ownerSession.accessToken,
      {
        edition: "Launch Edition",
        status: "active"
      }
    );
    expect(updateVariantResponse.statusCode).toBe(200);
    expect(
      adminProductVariantResponseSchema.parse(JSON.parse(updateVariantResponse.payload)).edition
    ).toBe("Launch Edition");

    const createStoreResponse = await injectJson(
      "POST",
      "/admin/stores",
      ownerSession.accessToken,
      {
        name: "Example Retail",
        domain: "SHOP.EXAMPLE.COM",
        reputationScore: 80,
        status: "active",
        type: "retailer"
      }
    );
    expect(createStoreResponse.statusCode).toBe(201);

    const store = adminStoreResponseSchema.parse(JSON.parse(createStoreResponse.payload));
    expect(store.domain).toBe("shop.example.com");

    const duplicateStoreResponse = await injectJson(
      "POST",
      "/admin/stores",
      ownerSession.accessToken,
      {
        name: "Duplicate Retail",
        domain: "shop.example.com"
      }
    );
    expect(duplicateStoreResponse.statusCode).toBe(409);

    const storeListResponse = await injectHttp(
      "GET",
      "/admin/stores?status=active&type=retailer",
      ownerSession.accessToken
    );
    expect(storeListResponse.statusCode).toBe(200);
    expect(
      adminStoreListResponseSchema
        .parse(JSON.parse(storeListResponse.payload))
        .items.map((item) => item.id)
    ).toContain(store.id);

    const invalidOfferResponse = await injectJson(
      "POST",
      "/admin/offers",
      ownerSession.accessToken,
      {
        productVariantId: missingId,
        storeId: store.id,
        url: "https://shop.example.com/product/demo-console",
        currentPrice: { amountCents: 299_90, currency: "BRL" }
      }
    );
    expect(invalidOfferResponse.statusCode).toBe(400);

    const createOfferResponse = await injectJson(
      "POST",
      "/admin/offers",
      ownerSession.accessToken,
      {
        productVariantId: variant.id,
        storeId: store.id,
        url: "https://shop.example.com/product/demo-console",
        currentPrice: { amountCents: 299_90, currency: "BRL" },
        shipping: { amountCents: 19_90, currency: "BRL" },
        inStock: true
      }
    );
    expect(createOfferResponse.statusCode).toBe(201);

    const offer = adminOfferResponseSchema.parse(JSON.parse(createOfferResponse.payload));
    expect(offer.productVariantId).toBe(variant.id);
    expect(offer.currentPrice.amountCents).toBe(299_90);

    const offerListResponse = await injectHttp(
      "GET",
      `/admin/offers?productVariantId=${variant.id}&status=active`,
      ownerSession.accessToken
    );
    expect(offerListResponse.statusCode).toBe(200);
    expect(
      adminOfferListResponseSchema
        .parse(JSON.parse(offerListResponse.payload))
        .items.map((item) => item.id)
    ).toContain(offer.id);

    const updateOfferResponse = await injectJson(
      "PATCH",
      `/admin/offers/${offer.id}`,
      ownerSession.accessToken,
      {
        currentPrice: { amountCents: 279_90, currency: "BRL" },
        inStock: false,
        status: "out_of_stock"
      }
    );
    expect(updateOfferResponse.statusCode).toBe(200);
    expect(adminOfferResponseSchema.parse(JSON.parse(updateOfferResponse.payload)).status).toBe(
      "out_of_stock"
    );

    const createSnapshotResponse = await injectJson(
      "POST",
      "/admin/price-snapshots",
      ownerSession.accessToken,
      {
        offerId: offer.id,
        price: { amountCents: 249_90, currency: "BRL" },
        shipping: { amountCents: 0, currency: "BRL" },
        couponCode: "VALID10",
        couponDiscount: { amountCents: 10_00, currency: "BRL" },
        confirmedCashback: { amountCents: 5_00, currency: "BRL" },
        available: true,
        capturedAt: "2026-01-01T10:00:00.000Z"
      }
    );
    expect(createSnapshotResponse.statusCode).toBe(201);

    const snapshot = adminPriceSnapshotResponseSchema.parse(
      JSON.parse(createSnapshotResponse.payload)
    );
    expect(snapshot.offerId).toBe(offer.id);
    expect(snapshot.price.amountCents).toBe(249_90);

    const snapshotListResponse = await injectHttp(
      "GET",
      `/admin/price-snapshots?offerId=${offer.id}`,
      ownerSession.accessToken
    );
    expect(snapshotListResponse.statusCode).toBe(200);
    expect(
      adminPriceSnapshotListResponseSchema
        .parse(JSON.parse(snapshotListResponse.payload))
        .items.map((item) => item.id)
    ).toContain(snapshot.id);

    const refreshedOfferResponse = await injectHttp(
      "GET",
      `/admin/offers/${offer.id}`,
      ownerSession.accessToken
    );
    expect(refreshedOfferResponse.statusCode).toBe(200);

    const refreshedOffer = adminOfferResponseSchema.parse(
      JSON.parse(refreshedOfferResponse.payload)
    );
    expect(refreshedOffer.currentPrice.amountCents).toBe(249_90);
    expect(refreshedOffer.status).toBe("active");
    expect(refreshedOffer.inStock).toBe(true);

    const auditResponse = await injectHttp(
      "GET",
      `/admin/audit-logs?entityType=offer&entityId=${offer.id}`,
      ownerSession.accessToken
    );
    expect(auditResponse.statusCode).toBe(200);

    const auditLog = adminAuditLogListResponseSchema.parse(JSON.parse(auditResponse.payload));
    expect(auditLog.items.length).toBeGreaterThanOrEqual(2);

    const updateAudit = auditLog.items.find((item) => item.action === "update");
    expect(updateAudit).toBeDefined();
    expect(isRecord(updateAudit?.metadata.request)).toBe(true);
    expect(isRecord(updateAudit?.metadata.before)).toBe(true);
    expect(isRecord(updateAudit?.metadata.after)).toBe(true);
    expect(isRecord(updateAudit?.metadata.changes)).toBe(true);

    const expireOfferResponse = await injectHttp(
      "DELETE",
      `/admin/offers/${offer.id}`,
      ownerSession.accessToken
    );
    expect(expireOfferResponse.statusCode).toBe(204);

    const expiredOfferResponse = await injectHttp(
      "GET",
      `/admin/offers/${offer.id}`,
      ownerSession.accessToken
    );
    expect(adminOfferResponseSchema.parse(JSON.parse(expiredOfferResponse.payload)).status).toBe(
      "expired"
    );

    const archiveVariantResponse = await injectHttp(
      "DELETE",
      `/admin/product-variants/${variant.id}`,
      ownerSession.accessToken
    );
    expect(archiveVariantResponse.statusCode).toBe(204);

    const archivedVariantResponse = await injectHttp(
      "GET",
      `/admin/product-variants/${variant.id}`,
      ownerSession.accessToken
    );
    expect(
      adminProductVariantResponseSchema.parse(JSON.parse(archivedVariantResponse.payload)).status
    ).toBe("archived");

    const archiveStoreResponse = await injectHttp(
      "DELETE",
      `/admin/stores/${store.id}`,
      ownerSession.accessToken
    );
    expect(archiveStoreResponse.statusCode).toBe(204);

    const archivedStoreResponse = await injectHttp(
      "GET",
      `/admin/stores/${store.id}`,
      ownerSession.accessToken
    );
    expect(adminStoreResponseSchema.parse(JSON.parse(archivedStoreResponse.payload)).status).toBe(
      "archived"
    );
  });

  async function registerUser(email: string) {
    const response = await injectJson("POST", "/auth/register", undefined, {
      name: "Commerce Test User",
      email,
      password: "ValidTestPassword123!"
    });

    expect(response.statusCode).toBe(201);

    return authSessionSchema.parse(JSON.parse(response.payload));
  }

  async function promoteUserRole(userId: string, role: "admin" | "owner"): Promise<void> {
    await db.update(users).set({ role }).where(eq(users.id, userId));
  }

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

    const [product] = await db
      .insert(products)
      .values({
        categoryId: requireValue(category).id,
        brandId: requireValue(brand).id,
        name: "Demo Console Pro",
        status: "active"
      })
      .returning({
        id: products.id
      });

    return requireValue(product);
  }

  async function injectHttp(method: "DELETE" | "GET", url: string, accessToken?: string) {
    const request = {
      method,
      url,
      ...(accessToken
        ? {
            headers: {
              authorization: `Bearer ${accessToken}`
            }
          }
        : {})
    };

    return requireValue(app).getHttpAdapter().getInstance().inject(request);
  }

  async function injectJson(
    method: "PATCH" | "POST",
    url: string,
    accessToken: string | undefined,
    payload: unknown
  ) {
    return requireValue(app)
      .getHttpAdapter()
      .getInstance()
      .inject({
        method,
        url,
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
        },
        payload: JSON.stringify(payload)
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
    throw new Error("TEST_DATABASE_URL is required for admin commerce integration tests.");
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
