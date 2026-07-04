import "reflect-metadata";
import {
  adminAuditLogListResponseSchema,
  authSessionSchema,
  priceAlertListResponseSchema,
  priceAlertResponseSchema,
  priceAlertVerificationResponseSchema
} from "@dealtrust/contracts";
import type { Database, SqlClient } from "@dealtrust/db";
import {
  brands,
  categories,
  createDatabaseClient,
  createSqlClient,
  notifications,
  offers,
  priceSnapshots,
  products,
  productVariants,
  runMigrations,
  stores,
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

describe.skipIf(!testDatabaseUrl)("price alert verification worker", () => {
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

  it("verifies active alerts, enqueues notifications and records admin audit", async () => {
    const anonymousResponse = await injectJson("POST", "/admin/alerts/verify", undefined, {
      limit: 100
    });
    expect(anonymousResponse.statusCode).toBe(401);

    const fixture = await createPricingFixture();
    const userSession = await registerUser("alert-worker.user@example.com");
    const regularSession = await registerUser("alert-worker.regular@example.com");
    const ownerSession = await registerUser("alert-worker.owner@example.com");
    await promoteUserRole(ownerSession.user.id, "owner");

    const forbiddenResponse = await injectJson(
      "POST",
      "/admin/alerts/verify",
      regularSession.accessToken,
      { limit: 100 }
    );
    expect(forbiddenResponse.statusCode).toBe(403);

    const targetAlert = await createAlert(userSession.accessToken, {
      productVariantId: fixture.variantId,
      type: "target_price",
      targetPrice: { amountCents: 160_00, currency: "BRL" }
    });
    const missedTargetAlert = await createAlert(userSession.accessToken, {
      productVariantId: fixture.variantId,
      type: "target_price",
      targetPrice: { amountCents: 100_00, currency: "BRL" }
    });
    const dropAlert = await createAlert(userSession.accessToken, {
      productVariantId: fixture.variantId,
      type: "drop_percent",
      dropPercent: 25
    });
    const historicalLowAlert = await createAlert(userSession.accessToken, {
      productVariantId: fixture.variantId,
      type: "historical_low"
    });
    const pausedAlert = await createAlert(userSession.accessToken, {
      productVariantId: fixture.variantId,
      type: "target_price",
      targetPrice: { amountCents: 170_00, currency: "BRL" }
    });

    const pauseResponse = await injectJson(
      "PATCH",
      `/alerts/${pausedAlert.id}`,
      userSession.accessToken,
      { status: "paused" }
    );
    expect(pauseResponse.statusCode).toBe(200);

    const verifyResponse = await injectJson(
      "POST",
      "/admin/alerts/verify",
      ownerSession.accessToken,
      { limit: 100 }
    );
    expect(verifyResponse.statusCode).toBe(200);

    const verification = priceAlertVerificationResponseSchema.parse(
      JSON.parse(verifyResponse.payload)
    );
    expect(verification.scannedAlertCount).toBe(4);
    expect(verification.triggeredAlertCount).toBe(3);
    expect(verification.notificationCount).toBe(3);
    expect(verification.skippedAlertCount).toBe(1);
    expect(verification.triggeredAlerts.map((alert) => alert.id).sort()).toEqual(
      [dropAlert.id, historicalLowAlert.id, targetAlert.id].sort()
    );
    expect(verification.triggeredAlerts.map((alert) => alert.reason).sort()).toEqual([
      "drop_percent_reached",
      "historical_low_reached",
      "target_price_reached"
    ]);

    const triggeredListResponse = await injectHttp(
      "GET",
      "/alerts?status=triggered",
      userSession.accessToken
    );
    expect(triggeredListResponse.statusCode).toBe(200);
    expect(
      priceAlertListResponseSchema
        .parse(JSON.parse(triggeredListResponse.payload))
        .items.map((alert) => alert.id)
        .sort()
    ).toEqual([dropAlert.id, historicalLowAlert.id, targetAlert.id].sort());

    const activeListResponse = await injectHttp(
      "GET",
      "/alerts?status=active",
      userSession.accessToken
    );
    expect(activeListResponse.statusCode).toBe(200);
    expect(
      priceAlertListResponseSchema
        .parse(JSON.parse(activeListResponse.payload))
        .items.map((alert) => alert.id)
    ).toEqual([missedTargetAlert.id]);

    const notificationRows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userSession.user.id));
    expect(notificationRows).toHaveLength(3);
    expect(notificationRows.every((row) => row.status === "pending")).toBe(true);
    expect(notificationRows.every((row) => row.channel === "email")).toBe(true);

    const auditResponse = await injectHttp(
      "GET",
      "/admin/audit-logs?entityType=price_alert_verification",
      ownerSession.accessToken
    );
    expect(auditResponse.statusCode).toBe(200);

    const auditLog = adminAuditLogListResponseSchema.parse(JSON.parse(auditResponse.payload));
    expect(auditLog.items).toHaveLength(1);
    expect(auditLog.items[0]?.action).toBe("update");

    const secondVerifyResponse = await injectJson(
      "POST",
      "/admin/alerts/verify",
      ownerSession.accessToken,
      { limit: 100 }
    );
    expect(secondVerifyResponse.statusCode).toBe(200);

    const secondVerification = priceAlertVerificationResponseSchema.parse(
      JSON.parse(secondVerifyResponse.payload)
    );
    expect(secondVerification.scannedAlertCount).toBe(1);
    expect(secondVerification.triggeredAlertCount).toBe(0);
    expect(secondVerification.notificationCount).toBe(0);
    expect(secondVerification.skippedAlertCount).toBe(1);

    const notificationRowsAfterRerun = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userSession.user.id));
    expect(notificationRowsAfterRerun).toHaveLength(3);
  });

  async function registerUser(email: string) {
    const response = await injectJson("POST", "/auth/register", undefined, {
      name: "Alert Worker Test User",
      email,
      password: "ValidTestPassword123!"
    });

    expect(response.statusCode).toBe(201);

    return authSessionSchema.parse(JSON.parse(response.payload));
  }

  async function promoteUserRole(userId: string, role: "admin" | "owner"): Promise<void> {
    await db.update(users).set({ role }).where(eq(users.id, userId));
  }

  async function createAlert(accessToken: string, payload: unknown) {
    const response = await injectJson("POST", "/alerts", accessToken, payload);
    expect(response.statusCode).toBe(201);

    return priceAlertResponseSchema.parse(JSON.parse(response.payload));
  }

  async function createPricingFixture() {
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

    const [variant] = await db
      .insert(productVariants)
      .values({
        productId: requireValue(product).id,
        color: "Black",
        status: "active"
      })
      .returning({
        id: productVariants.id
      });

    const [store] = await db
      .insert(stores)
      .values({
        name: "Example Retail",
        domain: "worker.example.com",
        reputationScore: 90,
        status: "active",
        type: "retailer"
      })
      .returning({
        id: stores.id
      });

    const [offer] = await db
      .insert(offers)
      .values({
        productVariantId: requireValue(variant).id,
        storeId: requireValue(store).id,
        url: "https://worker.example.com/product/demo-console",
        currentPriceCents: 150_00,
        shippingCents: 0,
        inStock: true,
        status: "active"
      })
      .returning({
        id: offers.id
      });

    await db.insert(priceSnapshots).values([
      {
        offerId: requireValue(offer).id,
        priceCents: 200_00,
        shippingCents: 0,
        available: true,
        capturedAt: new Date("2026-01-01T10:00:00.000Z")
      },
      {
        offerId: requireValue(offer).id,
        priceCents: 220_00,
        shippingCents: 0,
        available: true,
        capturedAt: new Date("2026-01-02T10:00:00.000Z")
      }
    ]);

    return {
      variantId: requireValue(variant).id
    };
  }

  async function injectHttp(method: "DELETE" | "GET", url: string, accessToken?: string) {
    return requireValue(app)
      .getHttpAdapter()
      .getInstance()
      .inject({
        method,
        url,
        ...(accessToken
          ? {
              headers: {
                authorization: `Bearer ${accessToken}`
              }
            }
          : {})
      });
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
    throw new Error("TEST_DATABASE_URL is required for price alert verification tests.");
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
