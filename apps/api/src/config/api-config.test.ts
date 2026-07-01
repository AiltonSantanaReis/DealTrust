import { describe, expect, it } from "vitest";
import { loadApiConfig } from "./api-config.js";

describe("loadApiConfig", () => {
  it("loads defaults for local development", () => {
    const config = loadApiConfig({});

    expect(config).toEqual({
      environment: "development",
      port: 3001,
      databaseUrl: "postgres://dealtrust:dealtrust@localhost:5432/dealtrust",
      databaseMaxConnections: 10,
      valkeyUrl: "redis://localhost:6379",
      authJwtSecret: "dealtrust-local-development-secret-change-before-production",
      authAccessTokenTtlSeconds: 900,
      apiBodyLimitBytes: 1_048_576,
      apiRateLimitWindowSeconds: 60,
      apiRateLimitMaxRequests: 300,
      apiCorsOrigins: []
    });
  });

  it("coerces numeric values from environment variables", () => {
    const config = loadApiConfig({
      NODE_ENV: "test",
      API_PORT: "0",
      DATABASE_URL: "postgresql://dealtrust:dealtrust@localhost:5432/dealtrust_test",
      DATABASE_MAX_CONNECTIONS: "3",
      VALKEY_URL: "redis://localhost:6379",
      AUTH_ACCESS_TOKEN_TTL_SECONDS: "1200",
      API_BODY_LIMIT_BYTES: "2097152",
      API_RATE_LIMIT_WINDOW_SECONDS: "30",
      API_RATE_LIMIT_MAX_REQUESTS: "120",
      API_CORS_ORIGINS: "https://app.example.com,https://admin.example.com"
    });

    expect(config.port).toBe(0);
    expect(config.databaseMaxConnections).toBe(3);
    expect(config.environment).toBe("test");
    expect(config.authAccessTokenTtlSeconds).toBe(1200);
    expect(config.apiBodyLimitBytes).toBe(2_097_152);
    expect(config.apiRateLimitWindowSeconds).toBe(30);
    expect(config.apiRateLimitMaxRequests).toBe(120);
    expect(config.apiCorsOrigins).toEqual(["https://app.example.com", "https://admin.example.com"]);
  });

  it("rejects invalid database URLs", () => {
    expect(() =>
      loadApiConfig({
        DATABASE_URL: "https://example.com/not-postgres"
      })
    ).toThrow("Invalid API configuration");
  });

  it("rejects invalid API ports", () => {
    expect(() =>
      loadApiConfig({
        API_PORT: "99999"
      })
    ).toThrow("Invalid API configuration");
  });

  it("requires an explicit JWT secret in production", () => {
    expect(() =>
      loadApiConfig({
        NODE_ENV: "production"
      })
    ).toThrow("AUTH_JWT_SECRET is required in production");
  });

  it("loads an explicit production JWT secret", () => {
    const config = loadApiConfig({
      NODE_ENV: "production",
      AUTH_JWT_SECRET: "production-secret-with-at-least-thirty-two-chars"
    });

    expect(config.authJwtSecret).toBe("production-secret-with-at-least-thirty-two-chars");
  });
});
