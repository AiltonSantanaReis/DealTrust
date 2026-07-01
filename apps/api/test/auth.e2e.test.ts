import "reflect-metadata";
import { TextEncoder } from "node:util";
import { authSessionSchema } from "@dealtrust/contracts";
import type { Database, SqlClient } from "@dealtrust/db";
import { createDatabaseClient, createSqlClient, runMigrations, users } from "@dealtrust/db";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const authJwtSecret = "test-secret-with-at-least-thirty-two-chars";
const schemaResetLockId = 332_001;

describe.skipIf(!testDatabaseUrl)("POST /auth", () => {
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

  it("registers a user, stores a password hash, rejects duplicates and logs in", async () => {
    const email = "auth.flow@example.com";
    const password = "correct-horse-battery-123";

    const invalidPayloadResponse = await injectJson("POST", "/auth/register", {
      name: "A",
      email: "invalid-email",
      password: "short"
    });

    expect(invalidPayloadResponse.statusCode).toBe(400);

    const registerResponse = await injectJson("POST", "/auth/register", {
      name: "  Auth Flow User  ",
      email: `  ${email.toUpperCase()}  `,
      password
    });

    expect(registerResponse.statusCode).toBe(201);

    const registerSession = authSessionSchema.parse(JSON.parse(registerResponse.payload));
    expect(registerSession.user.email).toBe(email);
    expect(registerSession.user.name).toBe("Auth Flow User");
    expect(registerSession.tokenType).toBe("Bearer");

    const registerToken = await jwtVerify(
      registerSession.accessToken,
      new TextEncoder().encode(authJwtSecret),
      {
        issuer: "dealtrust-api",
        audience: "dealtrust-users"
      }
    );

    expect(registerToken.payload.sub).toBe(registerSession.user.id);
    expect(registerToken.payload.role).toBe("user");

    const storedUser = await findStoredUserByEmail(email);

    expect(storedUser.passwordHash).not.toBe(password);
    expect(storedUser.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(storedUser.status).toBe("active");
    expect(storedUser.lastLoginAt).toBeNull();

    const duplicateResponse = await injectJson("POST", "/auth/register", {
      name: "Duplicate User",
      email,
      password
    });

    expect(duplicateResponse.statusCode).toBe(409);

    const wrongPasswordResponse = await injectJson("POST", "/auth/login", {
      email,
      password: "wrong-password-123"
    });

    expect(wrongPasswordResponse.statusCode).toBe(401);

    const loginResponse = await injectJson("POST", "/auth/login", {
      email: email.toUpperCase(),
      password
    });

    expect(loginResponse.statusCode).toBe(200);

    const loginSession = authSessionSchema.parse(JSON.parse(loginResponse.payload));
    expect(loginSession.user.id).toBe(registerSession.user.id);
    expect(loginSession.expiresInSeconds).toBe(900);

    const userAfterLogin = await findStoredUserByEmail(email);
    expect(userAfterLogin.lastLoginAt).toBeInstanceOf(Date);
  });

  async function injectJson(method: "POST", url: string, payload: unknown) {
    return requireValue(app)
      .getHttpAdapter()
      .getInstance()
      .inject({
        method,
        url,
        headers: {
          "content-type": "application/json"
        },
        payload: JSON.stringify(payload)
      });
  }

  async function findStoredUserByEmail(email: string) {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        status: users.status,
        lastLoginAt: users.lastLoginAt
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return requireValue(rows.at(0));
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
    throw new Error("TEST_DATABASE_URL is required for auth integration tests.");
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
