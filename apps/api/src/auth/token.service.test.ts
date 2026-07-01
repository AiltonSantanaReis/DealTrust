import { TextEncoder } from "node:util";
import type { AuthUser } from "@dealtrust/contracts";
import { jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import type { ApiConfig } from "../config/api-config.js";
import { TokenService } from "./token.service.js";

const authJwtSecret = "test-secret-with-at-least-thirty-two-chars";

const config: ApiConfig = {
  environment: "test",
  port: 0,
  databaseUrl: "postgres://dealtrust:dealtrust@localhost:5432/dealtrust_test",
  databaseMaxConnections: 2,
  valkeyUrl: "redis://localhost:6379",
  authJwtSecret,
  authAccessTokenTtlSeconds: 900
};

const user: AuthUser = {
  id: "53cf458e-8c72-48f4-bcd4-9b4a8d649c7c",
  name: "Example User",
  email: "user@example.com",
  role: "user"
};

describe("TokenService", () => {
  it("creates verifiable HS256 access tokens with stable auth claims", async () => {
    const service = new TokenService(config);

    const token = await service.createAccessToken(user);
    const verified = await jwtVerify(token, new TextEncoder().encode(authJwtSecret), {
      issuer: "dealtrust-api",
      audience: "dealtrust-users"
    });

    expect(service.getExpiresInSeconds()).toBe(900);
    expect(verified.protectedHeader.alg).toBe("HS256");
    expect(verified.payload.sub).toBe(user.id);
    expect(verified.payload.email).toBe(user.email);
    expect(verified.payload.role).toBe(user.role);
  });
});
