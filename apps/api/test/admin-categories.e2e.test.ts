import "reflect-metadata";
import {
  authSessionSchema,
  categoryListResponseSchema,
  categoryResponseSchema
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

describe.skipIf(!testDatabaseUrl)("admin categories", () => {
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

  it("requires admin role and manages categories end to end", async () => {
    const anonymousResponse = await injectHttp("GET", "/admin/categories");
    expect(anonymousResponse.statusCode).toBe(401);

    const userSession = await registerUser("catalog.user@example.com");
    const forbiddenResponse = await injectHttp("GET", "/admin/categories", userSession.accessToken);
    expect(forbiddenResponse.statusCode).toBe(403);

    const adminSession = await registerUser("catalog.admin@example.com");
    await promoteUserToAdmin(adminSession.user.id);

    const meResponse = await injectHttp("GET", "/auth/me", adminSession.accessToken);
    expect(meResponse.statusCode).toBe(200);
    expect(JSON.parse(meResponse.payload).role).toBe("admin");

    const createResponse = await injectJson("POST", "/admin/categories", adminSession.accessToken, {
      name: "  Vídeo Games  "
    });

    expect(createResponse.statusCode).toBe(201);

    const createdCategory = categoryResponseSchema.parse(JSON.parse(createResponse.payload));
    expect(createdCategory.name).toBe("Vídeo Games");
    expect(createdCategory.slug).toBe("video-games");
    expect(createdCategory.status).toBe("active");

    const duplicateResponse = await injectJson(
      "POST",
      "/admin/categories",
      adminSession.accessToken,
      {
        name: "Video Games"
      }
    );

    expect(duplicateResponse.statusCode).toBe(409);

    const listResponse = await injectHttp(
      "GET",
      "/admin/categories?status=active&q=Games",
      adminSession.accessToken
    );

    expect(listResponse.statusCode).toBe(200);

    const list = categoryListResponseSchema.parse(JSON.parse(listResponse.payload));
    expect(list.items.map((category) => category.id)).toContain(createdCategory.id);

    const getResponse = await injectHttp(
      "GET",
      `/admin/categories/${createdCategory.id}`,
      adminSession.accessToken
    );

    expect(getResponse.statusCode).toBe(200);
    expect(categoryResponseSchema.parse(JSON.parse(getResponse.payload)).id).toBe(
      createdCategory.id
    );

    const updateResponse = await injectJson(
      "PATCH",
      `/admin/categories/${createdCategory.id}`,
      adminSession.accessToken,
      {
        name: "Console Games",
        status: "blocked"
      }
    );

    expect(updateResponse.statusCode).toBe(200);

    const updatedCategory = categoryResponseSchema.parse(JSON.parse(updateResponse.payload));
    expect(updatedCategory.name).toBe("Console Games");
    expect(updatedCategory.slug).toBe("video-games");
    expect(updatedCategory.status).toBe("blocked");

    const deleteResponse = await injectHttp(
      "DELETE",
      `/admin/categories/${createdCategory.id}`,
      adminSession.accessToken
    );

    expect(deleteResponse.statusCode).toBe(204);

    const archivedResponse = await injectHttp(
      "GET",
      `/admin/categories/${createdCategory.id}`,
      adminSession.accessToken
    );

    expect(archivedResponse.statusCode).toBe(200);
    expect(categoryResponseSchema.parse(JSON.parse(archivedResponse.payload)).status).toBe(
      "archived"
    );
  });

  async function registerUser(email: string) {
    const response = await injectJson("POST", "/auth/register", undefined, {
      name: "Catalog Test User",
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
    throw new Error("TEST_DATABASE_URL is required for admin category integration tests.");
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
