import "reflect-metadata";
import {
  adminProductListResponseSchema,
  adminProductResponseSchema,
  authSessionSchema
} from "@dealtrust/contracts";
import type { Database, SqlClient } from "@dealtrust/db";
import {
  brands,
  categories,
  createDatabaseClient,
  createSqlClient,
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

describe.skipIf(!testDatabaseUrl)("admin products", () => {
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

  it("requires admin role and manages products end to end", async () => {
    const anonymousResponse = await injectHttp("GET", "/admin/products");
    expect(anonymousResponse.statusCode).toBe(401);

    const userSession = await registerUser("products.user@example.com");
    const forbiddenResponse = await injectHttp("GET", "/admin/products", userSession.accessToken);
    expect(forbiddenResponse.statusCode).toBe(403);

    const adminSession = await registerUser("products.admin@example.com");
    await promoteUserToAdmin(adminSession.user.id);

    const category = await createCategoryFixture();
    const brand = await createBrandFixture();

    const invalidReferenceResponse = await injectJson(
      "POST",
      "/admin/products",
      adminSession.accessToken,
      {
        categoryId: "53cf458e-8c72-48f4-bcd4-9b4a8d649c7c",
        brandId: brand.id,
        name: "Reference Test Product"
      }
    );

    expect(invalidReferenceResponse.statusCode).toBe(400);

    const createResponse = await injectJson("POST", "/admin/products", adminSession.accessToken, {
      categoryId: category.id,
      brandId: brand.id,
      name: "  Demo Console Pro  ",
      model: "DCP-1000",
      description: "Reference product for catalog validation.",
      imageUrl: "https://example.com/products/demo-console-pro.jpg"
    });

    expect(createResponse.statusCode).toBe(201);

    const createdProduct = adminProductResponseSchema.parse(JSON.parse(createResponse.payload));
    expect(createdProduct.categoryId).toBe(category.id);
    expect(createdProduct.brandId).toBe(brand.id);
    expect(createdProduct.name).toBe("Demo Console Pro");
    expect(createdProduct.status).toBe("draft");

    const listResponse = await injectHttp(
      "GET",
      `/admin/products?status=draft&q=Console&brandId=${brand.id}`,
      adminSession.accessToken
    );

    expect(listResponse.statusCode).toBe(200);

    const list = adminProductListResponseSchema.parse(JSON.parse(listResponse.payload));
    expect(list.items.map((product) => product.id)).toContain(createdProduct.id);

    const getResponse = await injectHttp(
      "GET",
      `/admin/products/${createdProduct.id}`,
      adminSession.accessToken
    );

    expect(getResponse.statusCode).toBe(200);
    expect(adminProductResponseSchema.parse(JSON.parse(getResponse.payload)).id).toBe(
      createdProduct.id
    );

    const updateResponse = await injectJson(
      "PATCH",
      `/admin/products/${createdProduct.id}`,
      adminSession.accessToken,
      {
        name: "Demo Console Pro Bundle",
        description: null,
        imageUrl: null,
        status: "active"
      }
    );

    expect(updateResponse.statusCode).toBe(200);

    const updatedProduct = adminProductResponseSchema.parse(JSON.parse(updateResponse.payload));
    expect(updatedProduct.name).toBe("Demo Console Pro Bundle");
    expect(updatedProduct.description).toBeNull();
    expect(updatedProduct.imageUrl).toBeNull();
    expect(updatedProduct.status).toBe("active");

    const deleteResponse = await injectHttp(
      "DELETE",
      `/admin/products/${createdProduct.id}`,
      adminSession.accessToken
    );

    expect(deleteResponse.statusCode).toBe(204);

    const archivedResponse = await injectHttp(
      "GET",
      `/admin/products/${createdProduct.id}`,
      adminSession.accessToken
    );

    expect(archivedResponse.statusCode).toBe(200);
    expect(adminProductResponseSchema.parse(JSON.parse(archivedResponse.payload)).status).toBe(
      "archived"
    );
  });

  async function registerUser(email: string) {
    const response = await injectJson("POST", "/auth/register", undefined, {
      name: "Product Test User",
      email,
      password: "ValidTestPassword123!"
    });

    expect(response.statusCode).toBe(201);

    return authSessionSchema.parse(JSON.parse(response.payload));
  }

  async function promoteUserToAdmin(userId: string): Promise<void> {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
  }

  async function createCategoryFixture() {
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

    return requireValue(category);
  }

  async function createBrandFixture() {
    const [brand] = await db
      .insert(brands)
      .values({
        name: "Example Electronics",
        slug: "example-electronics"
      })
      .returning({
        id: brands.id
      });

    return requireValue(brand);
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
    throw new Error("TEST_DATABASE_URL is required for admin product integration tests.");
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
