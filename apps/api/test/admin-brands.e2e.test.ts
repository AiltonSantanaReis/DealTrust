import "reflect-metadata";
import {
  authSessionSchema,
  brandListResponseSchema,
  brandResponseSchema
} from "@dealtrust/contracts";
import type { Database, SqlClient } from "@dealtrust/db";
import { createDatabaseClient, createSqlClient, runMigrations, users } from "@dealtrust/db";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const authJwtSecret = "test-secret-with-at-least-thirty-two-chars";
const schemaResetLockId = 332_001;

describe.skipIf(!testDatabaseUrl)("admin brands", () => {
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

  it("requires admin role and manages brands end to end", async () => {
    const anonymousResponse = await injectHttp("GET", "/admin/brands");
    expect(anonymousResponse.statusCode).toBe(401);

    const userSession = await registerUser("brands.user@example.com");
    const forbiddenResponse = await injectHttp("GET", "/admin/brands", userSession.accessToken);
    expect(forbiddenResponse.statusCode).toBe(403);

    const adminSession = await registerUser("brands.admin@example.com");
    await promoteUserToAdmin(adminSession.user.id);

    const invalidPayloadResponse = await injectJson(
      "POST",
      "/admin/brands",
      adminSession.accessToken,
      {
        name: " "
      }
    );

    expect(invalidPayloadResponse.statusCode).toBe(400);

    const createResponse = await injectJson("POST", "/admin/brands", adminSession.accessToken, {
      name: "  Nintendo  "
    });

    expect(createResponse.statusCode).toBe(201);

    const createdBrand = brandResponseSchema.parse(JSON.parse(createResponse.payload));
    expect(createdBrand.name).toBe("Nintendo");
    expect(createdBrand.slug).toBe("nintendo");

    const duplicateResponse = await injectJson("POST", "/admin/brands", adminSession.accessToken, {
      name: "Nintendo"
    });

    expect(duplicateResponse.statusCode).toBe(409);

    const listResponse = await injectHttp(
      "GET",
      "/admin/brands?q=Nintendo",
      adminSession.accessToken
    );

    expect(listResponse.statusCode).toBe(200);

    const list = brandListResponseSchema.parse(JSON.parse(listResponse.payload));
    expect(list.items.map((brand) => brand.id)).toContain(createdBrand.id);

    const getResponse = await injectHttp(
      "GET",
      `/admin/brands/${createdBrand.id}`,
      adminSession.accessToken
    );

    expect(getResponse.statusCode).toBe(200);
    expect(brandResponseSchema.parse(JSON.parse(getResponse.payload)).id).toBe(createdBrand.id);

    const updateResponse = await injectJson(
      "PATCH",
      `/admin/brands/${createdBrand.id}`,
      adminSession.accessToken,
      {
        name: "Nintendo Switch",
        slug: "nintendo-switch"
      }
    );

    expect(updateResponse.statusCode).toBe(200);

    const updatedBrand = brandResponseSchema.parse(JSON.parse(updateResponse.payload));
    expect(updatedBrand.name).toBe("Nintendo Switch");
    expect(updatedBrand.slug).toBe("nintendo-switch");

    const deleteResponse = await injectHttp(
      "DELETE",
      `/admin/brands/${createdBrand.id}`,
      adminSession.accessToken
    );

    expect(deleteResponse.statusCode).toBe(204);

    const missingResponse = await injectHttp(
      "GET",
      `/admin/brands/${createdBrand.id}`,
      adminSession.accessToken
    );

    expect(missingResponse.statusCode).toBe(404);
  });

  async function registerUser(email: string) {
    const response = await injectJson("POST", "/auth/register", undefined, {
      name: "Brand Test User",
      email,
      password: "correct-horse-battery-123"
    });

    expect(response.statusCode).toBe(201);

    return authSessionSchema.parse(JSON.parse(response.payload));
  }

  async function promoteUserToAdmin(userId: string): Promise<void> {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
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
    throw new Error("TEST_DATABASE_URL is required for admin brand integration tests.");
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
