import "reflect-metadata";
import {
  adminAuditLogListResponseSchema,
  authSessionSchema,
  notificationDeliveryResponseSchema
} from "@dealtrust/contracts";
import type { Database, SqlClient } from "@dealtrust/db";
import {
  createDatabaseClient,
  createSqlClient,
  notifications,
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

describe.skipIf(!testDatabaseUrl)("notification delivery", () => {
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
      AUTH_ACCESS_TOKEN_TTL_SECONDS: "900",
      SMTP_HOST: "localhost",
      SMTP_PORT: "1025",
      SMTP_SECURE: "false",
      MAIL_FROM: "alerts@example.com"
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

  it("sends pending email notifications through SMTP and records admin audit", async () => {
    const anonymousResponse = await injectJson(
      "POST",
      "/admin/notifications/send-pending",
      undefined,
      { limit: 100 }
    );
    expect(anonymousResponse.statusCode).toBe(401);

    const userSession = await registerUser("notification.user@example.com");
    const regularSession = await registerUser("notification.regular@example.com");
    const ownerSession = await registerUser("notification.owner@example.com");
    await promoteUserRole(ownerSession.user.id, "owner");

    const forbiddenResponse = await injectJson(
      "POST",
      "/admin/notifications/send-pending",
      regularSession.accessToken,
      { limit: 100 }
    );
    expect(forbiddenResponse.statusCode).toBe(403);

    const pendingEmailNotificationId = await createNotification(userSession.user.id, {
      channel: "email",
      title: "Price alert",
      body: "The product reached the requested price.",
      status: "pending"
    });
    const pendingPushNotificationId = await createNotification(userSession.user.id, {
      channel: "push",
      title: "Push alert",
      body: "This channel is not processed by the email delivery worker.",
      status: "pending"
    });
    const alreadySentNotificationId = await createNotification(userSession.user.id, {
      channel: "email",
      title: "Already sent",
      body: "This notification should not be processed again.",
      status: "sent",
      sentAt: new Date("2026-01-01T10:00:00.000Z")
    });

    const sendResponse = await injectJson(
      "POST",
      "/admin/notifications/send-pending",
      ownerSession.accessToken,
      { limit: 100 }
    );
    expect(sendResponse.statusCode).toBe(200);

    const delivery = notificationDeliveryResponseSchema.parse(JSON.parse(sendResponse.payload));
    expect(delivery).toMatchObject({
      scannedNotificationCount: 1,
      sentNotificationCount: 1,
      failedNotificationCount: 0,
      skippedNotificationCount: 0
    });

    const sentNotification = await getNotification(pendingEmailNotificationId);
    expect(sentNotification.status).toBe("sent");
    expect(sentNotification.sentAt).toBeInstanceOf(Date);

    const pushNotification = await getNotification(pendingPushNotificationId);
    expect(pushNotification.status).toBe("pending");
    expect(pushNotification.sentAt).toBeNull();

    const alreadySentNotification = await getNotification(alreadySentNotificationId);
    expect(alreadySentNotification.status).toBe("sent");
    expect(alreadySentNotification.sentAt?.toISOString()).toBe("2026-01-01T10:00:00.000Z");

    const auditResponse = await injectHttp(
      "GET",
      "/admin/audit-logs?entityType=notification_delivery",
      ownerSession.accessToken
    );
    expect(auditResponse.statusCode).toBe(200);

    const auditLog = adminAuditLogListResponseSchema.parse(JSON.parse(auditResponse.payload));
    expect(auditLog.items).toHaveLength(1);
    expect(auditLog.items[0]?.action).toBe("update");

    const secondSendResponse = await injectJson(
      "POST",
      "/admin/notifications/send-pending",
      ownerSession.accessToken,
      { limit: 100 }
    );
    expect(secondSendResponse.statusCode).toBe(200);

    const secondDelivery = notificationDeliveryResponseSchema.parse(
      JSON.parse(secondSendResponse.payload)
    );
    expect(secondDelivery).toMatchObject({
      scannedNotificationCount: 0,
      sentNotificationCount: 0,
      failedNotificationCount: 0,
      skippedNotificationCount: 0
    });
  });

  async function registerUser(email: string) {
    const response = await injectJson("POST", "/auth/register", undefined, {
      name: "Notification Test User",
      email,
      password: "ValidTestPassword123!"
    });

    expect(response.statusCode).toBe(201);

    return authSessionSchema.parse(JSON.parse(response.payload));
  }

  async function promoteUserRole(userId: string, role: "admin" | "owner"): Promise<void> {
    await db.update(users).set({ role }).where(eq(users.id, userId));
  }

  async function createNotification(
    userId: string,
    input: {
      readonly channel: "email" | "push";
      readonly title: string;
      readonly body: string;
      readonly status: "pending" | "sent";
      readonly sentAt?: Date;
    }
  ): Promise<string> {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId,
        channel: input.channel,
        title: input.title,
        body: input.body,
        status: input.status,
        sentAt: input.sentAt
      })
      .returning({
        id: notifications.id
      });

    return requireValue(notification).id;
  }

  async function getNotification(id: string) {
    const rows = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);

    return requireValue(rows.at(0));
  }

  async function injectHttp(method: "GET", url: string, accessToken?: string) {
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
    method: "POST",
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
    throw new Error("TEST_DATABASE_URL is required for notification delivery tests.");
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
