import "reflect-metadata";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

describe("API security controls", () => {
  let app: NestFastifyApplication | undefined;
  const originalEnv = process.env;

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      API_PORT: "0",
      DATABASE_URL: "postgres://dealtrust:dealtrust@localhost:5432/dealtrust_test",
      DATABASE_MAX_CONNECTIONS: "2",
      VALKEY_URL: "redis://localhost:6379",
      API_RATE_LIMIT_WINDOW_SECONDS: "60",
      API_RATE_LIMIT_MAX_REQUESTS: "2"
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

    process.env = originalEnv;
  });

  it("adds defensive HTTP headers and enforces a request limit", async () => {
    const firstResponse = await injectHealth();
    const secondResponse = await injectHealth();
    const thirdResponse = await injectHealth();

    expect(firstResponse.statusCode).toBe(200);
    expect(firstResponse.headers["x-content-type-options"]).toBe("nosniff");
    expect(firstResponse.headers["x-frame-options"]).toBe("DENY");
    expect(firstResponse.headers["referrer-policy"]).toBe("no-referrer");
    expect(firstResponse.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(secondResponse.statusCode).toBe(200);
    expect(thirdResponse.statusCode).toBe(429);
  });

  async function injectHealth() {
    return requireValue(app).getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/health"
    });
  }
});

function requireValue<T>(value: T | undefined): T {
  if (!value) {
    throw new Error("Expected value.");
  }

  return value;
}
