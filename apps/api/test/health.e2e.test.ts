import "reflect-metadata";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

describe("GET /health", () => {
  let app: NestFastifyApplication | undefined;
  const originalEnv = process.env;

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      API_PORT: "0",
      DATABASE_URL: "postgres://dealtrust:dealtrust@localhost:5432/dealtrust_test",
      DATABASE_MAX_CONNECTIONS: "2",
      VALKEY_URL: "redis://localhost:6379"
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

  it("returns live API health metadata through the real Nest/Fastify stack", async () => {
    const response = await requireValue(app).getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/health"
    });

    const body = JSON.parse(response.payload) as {
      status: string;
      service: string;
      environment: string;
      dependencies: {
        database: {
          configured: boolean;
          maxConnections: number;
        };
        valkey: {
          configured: boolean;
        };
      };
    };

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("dealtrust-api");
    expect(body.environment).toBe("test");
    expect(body.dependencies.database).toEqual({
      configured: true,
      maxConnections: 2
    });
    expect(body.dependencies.valkey.configured).toBe(true);
  });
});

function requireValue<T>(value: T | undefined): T {
  if (!value) {
    throw new Error("Expected value.");
  }

  return value;
}
