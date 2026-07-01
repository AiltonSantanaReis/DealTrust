import "reflect-metadata";
import {
  authSessionSchema,
  priceAlertListResponseSchema,
  priceAlertResponseSchema
} from "@dealtrust/contracts";
import type { Database, SqlClient } from "@dealtrust/db";
import {
  brands,
  categories,
  createDatabaseClient,
  createSqlClient,
  products,
  productVariants,
  runMigrations
} from "@dealtrust/db";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const authJwtSecret = "test-secret-with-at-least-thirty-two-chars";
const schemaResetLockId = 332_001;

describe.skipIf(!testDatabaseUrl)("price alerts", () => {
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

  it("requires authentication and manages user-owned price alerts", async () => {
    const anonymousResponse = await injectHttp("GET", "/alerts");
    expect(anonymousResponse.statusCode).toBe(401);

    const fixture = await createVariantFixture();
    const userSession = await registerUser("alerts.user@example.com");
    const otherSession = await registerUser("alerts.other@example.com");

    const inactiveVariantResponse = await injectJson("POST", "/alerts", userSession.accessToken, {
      productVariantId: fixture.draftVariantId,
      type: "target_price",
      targetPrice: { amountCents: 199_90, currency: "BRL" }
    });
    expect(inactiveVariantResponse.statusCode).toBe(400);

    const createTargetResponse = await injectJson("POST", "/alerts", userSession.accessToken, {
      productVariantId: fixture.activeVariantId,
      type: "target_price",
      targetPrice: { amountCents: 199_90, currency: "BRL" }
    });
    expect(createTargetResponse.statusCode).toBe(201);

    const targetAlert = priceAlertResponseSchema.parse(JSON.parse(createTargetResponse.payload));
    expect(targetAlert.type).toBe("target_price");
    expect(targetAlert.targetPrice?.amountCents).toBe(199_90);
    expect(targetAlert.dropPercent).toBeNull();
    expect(targetAlert.status).toBe("active");

    const createDropResponse = await injectJson("POST", "/alerts", userSession.accessToken, {
      productVariantId: fixture.activeVariantId,
      type: "drop_percent",
      dropPercent: 15
    });
    expect(createDropResponse.statusCode).toBe(201);

    const dropAlert = priceAlertResponseSchema.parse(JSON.parse(createDropResponse.payload));
    expect(dropAlert.type).toBe("drop_percent");
    expect(dropAlert.dropPercent).toBe(15);

    const listResponse = await injectHttp(
      "GET",
      `/alerts?productVariantId=${fixture.activeVariantId}`,
      userSession.accessToken
    );
    expect(listResponse.statusCode).toBe(200);

    const list = priceAlertListResponseSchema.parse(JSON.parse(listResponse.payload));
    expect(list.items.map((alert) => alert.id)).toEqual([targetAlert.id, dropAlert.id]);

    const forbiddenOwnershipResponse = await injectHttp(
      "GET",
      `/alerts/${targetAlert.id}`,
      otherSession.accessToken
    );
    expect(forbiddenOwnershipResponse.statusCode).toBe(404);

    const invalidUpdateResponse = await injectJson(
      "PATCH",
      `/alerts/${targetAlert.id}`,
      userSession.accessToken,
      {
        dropPercent: 20
      }
    );
    expect(invalidUpdateResponse.statusCode).toBe(400);

    const updateResponse = await injectJson(
      "PATCH",
      `/alerts/${targetAlert.id}`,
      userSession.accessToken,
      {
        targetPrice: { amountCents: 189_90, currency: "BRL" },
        status: "paused"
      }
    );
    expect(updateResponse.statusCode).toBe(200);

    const updatedAlert = priceAlertResponseSchema.parse(JSON.parse(updateResponse.payload));
    expect(updatedAlert.targetPrice?.amountCents).toBe(189_90);
    expect(updatedAlert.status).toBe("paused");

    const cancelResponse = await injectHttp(
      "DELETE",
      `/alerts/${dropAlert.id}`,
      userSession.accessToken
    );
    expect(cancelResponse.statusCode).toBe(204);

    const canceledResponse = await injectHttp(
      "GET",
      `/alerts/${dropAlert.id}`,
      userSession.accessToken
    );
    expect(canceledResponse.statusCode).toBe(200);
    expect(priceAlertResponseSchema.parse(JSON.parse(canceledResponse.payload)).status).toBe(
      "canceled"
    );
  });

  async function registerUser(email: string) {
    const response = await injectJson("POST", "/auth/register", undefined, {
      name: "Alert Test User",
      email,
      password: "ValidTestPassword123!"
    });

    expect(response.statusCode).toBe(201);

    return authSessionSchema.parse(JSON.parse(response.payload));
  }

  async function createVariantFixture() {
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

    const [activeVariant] = await db
      .insert(productVariants)
      .values({
        productId: requireValue(product).id,
        color: "Black",
        status: "active"
      })
      .returning({
        id: productVariants.id
      });

    const [draftVariant] = await db
      .insert(productVariants)
      .values({
        productId: requireValue(product).id,
        color: "White",
        status: "draft"
      })
      .returning({
        id: productVariants.id
      });

    return {
      activeVariantId: requireValue(activeVariant).id,
      draftVariantId: requireValue(draftVariant).id
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
    throw new Error("TEST_DATABASE_URL is required for price alert integration tests.");
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
