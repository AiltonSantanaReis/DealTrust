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
      valkeyUrl: "redis://localhost:6379"
    });
  });

  it("coerces numeric values from environment variables", () => {
    const config = loadApiConfig({
      NODE_ENV: "test",
      API_PORT: "0",
      DATABASE_URL: "postgresql://dealtrust:dealtrust@localhost:5432/dealtrust_test",
      DATABASE_MAX_CONNECTIONS: "3",
      VALKEY_URL: "redis://localhost:6379"
    });

    expect(config.port).toBe(0);
    expect(config.databaseMaxConnections).toBe(3);
    expect(config.environment).toBe("test");
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
});
