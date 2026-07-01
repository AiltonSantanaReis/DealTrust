import { TextEncoder } from "node:util";
import { type AuthUser, authUserRoleSchema } from "@dealtrust/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { API_CONFIG, type ApiConfig } from "../config/api-config.js";

const accessTokenClaimsSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  role: authUserRoleSchema
});

export type AccessTokenClaims = z.infer<typeof accessTokenClaimsSchema>;

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

  async verifyAccessToken(token: string): Promise<AccessTokenClaims | undefined> {
    try {
      const verified = await jwtVerify(token, this.secretKey, {
        issuer: "dealtrust-api",
        audience: "dealtrust-users"
      });

      return accessTokenClaimsSchema.parse(verified.payload);
    } catch {
      return undefined;
    }
  }
}
