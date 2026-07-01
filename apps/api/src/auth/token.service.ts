import { TextEncoder } from "node:util";
import type { AuthUser } from "@dealtrust/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { SignJWT } from "jose";
import { API_CONFIG, type ApiConfig } from "../config/api-config.js";

@Injectable()
export class TokenService {
  private readonly secretKey: Uint8Array;

  constructor(@Inject(API_CONFIG) private readonly config: ApiConfig) {
    this.secretKey = new TextEncoder().encode(config.authJwtSecret);
  }

  getExpiresInSeconds(): number {
    return this.config.authAccessTokenTtlSeconds;
  }

  async createAccessToken(user: AuthUser): Promise<string> {
    return new SignJWT({
      email: user.email,
      role: user.role
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("dealtrust-api")
      .setAudience("dealtrust-users")
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(`${this.config.authAccessTokenTtlSeconds}s`)
      .sign(this.secretKey);
  }
}
