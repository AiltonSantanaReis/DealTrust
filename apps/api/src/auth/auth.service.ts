import type { AuthSession, AuthUser, LoginRequest, RegisterRequest } from "@dealtrust/contracts";
import { users } from "@dealtrust/db";
import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DatabaseService } from "../database/database.service.js";
import { isUniqueViolation } from "../database/postgres-errors.js";
import { PasswordService } from "./password.service.js";
import { TokenService } from "./token.service.js";

type UserStatus = "active" | "pending_verification" | "blocked" | "deleted";

type StoredUserProfile = AuthUser & {
  readonly status: UserStatus;
};

type StoredUser = StoredUserProfile & {
  readonly passwordHash: string;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(TokenService) private readonly tokenService: TokenService
  ) {}

  async register(input: RegisterRequest): Promise<AuthSession> {
    const passwordHash = await this.passwordService.hashPassword(input.password);

    try {
      const [createdUser] = await this.database.db
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          passwordHash,
          status: "active"
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role
        });

      return this.createSession(requireCreatedUser(createdUser));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("Email already registered.");
      }

      throw error;
    }
  }

  async login(input: LoginRequest): Promise<AuthSession> {
    const user = await this.findUserByEmail(input.email);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    if (user.status !== "active") {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const passwordMatches = await this.passwordService.verifyPassword(
      user.passwordHash,
      input.password
    );

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const now = new Date();

    await this.database.db
      .update(users)
      .set({
        lastLoginAt: now,
        updatedAt: now
      })
      .where(eq(users.id, user.id));

    return this.createSession(toAuthUser(user));
  }

  async findActiveUserById(id: string): Promise<AuthUser | undefined> {
    const rows = await this.database.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    const user = rows.at(0);

    if (!user) {
      return undefined;
    }

    if (user.status !== "active") {
      return undefined;
    }

    return toAuthUser(user);
  }

  private async findUserByEmail(email: string): Promise<StoredUser | undefined> {
    const rows = await this.database.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        passwordHash: users.passwordHash
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return rows.at(0);
  }

  private async createSession(user: AuthUser): Promise<AuthSession> {
    return {
      accessToken: await this.tokenService.createAccessToken(user),
      tokenType: "Bearer",
      expiresInSeconds: this.tokenService.getExpiresInSeconds(),
      user
    };
  }
}

function toAuthUser(user: StoredUserProfile): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function requireCreatedUser(user: AuthUser | undefined): AuthUser {
  if (!user) {
    throw new Error("User insert did not return a row.");
  }

  return user;
}
