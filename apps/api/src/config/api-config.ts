import { z } from "zod";

export const API_CONFIG = Symbol("API_CONFIG");
const localAuthJwtSecret = "dealtrust-local-development-secret-change-before-production";

const postgresUrlSchema = z.string().refine(
  (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "postgres:" || url.protocol === "postgresql:";
    } catch {
      return false;
    }
  },
  { message: "must be a valid postgres:// or postgresql:// URL" }
);

const redisUrlSchema = z.string().refine(
  (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "redis:" || url.protocol === "rediss:";
    } catch {
      return false;
    }
  },
  { message: "must be a valid redis:// or rediss:// URL" }
);

const apiConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(0).max(65_535).default(3001),
  DATABASE_URL: postgresUrlSchema.default(
    "postgres://dealtrust:dealtrust@localhost:5432/dealtrust"
  ),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().int().min(1).max(50).default(10),
  VALKEY_URL: redisUrlSchema.default("redis://localhost:6379"),
  AUTH_JWT_SECRET: z.string().min(32).optional(),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
  API_BODY_LIMIT_BYTES: z.coerce.number().int().min(16_384).max(10_485_760).default(1_048_576),
  API_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(1).max(3_600).default(60),
  API_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).max(10_000).default(300),
  API_CORS_ORIGINS: z.string().default("")
});

export type ApiEnvironment = "development" | "test" | "production";

export type ApiConfig = {
  readonly environment: ApiEnvironment;
  readonly port: number;
  readonly databaseUrl: string;
  readonly databaseMaxConnections: number;
  readonly valkeyUrl: string;
  readonly authJwtSecret: string;
  readonly authAccessTokenTtlSeconds: number;
  readonly apiBodyLimitBytes: number;
  readonly apiRateLimitWindowSeconds: number;
  readonly apiRateLimitMaxRequests: number;
  readonly apiCorsOrigins: readonly string[];
};

export function loadApiConfig(env: NodeJS.ProcessEnv): ApiConfig {
  const parsed = apiConfigSchema.safeParse(env);

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid API configuration: ${errors}`);
  }

  if (parsed.data.NODE_ENV === "production" && !parsed.data.AUTH_JWT_SECRET) {
    throw new Error("Invalid API configuration: AUTH_JWT_SECRET is required in production");
  }

  return {
    environment: parsed.data.NODE_ENV,
    port: parsed.data.API_PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    databaseMaxConnections: parsed.data.DATABASE_MAX_CONNECTIONS,
    valkeyUrl: parsed.data.VALKEY_URL,
    authJwtSecret: parsed.data.AUTH_JWT_SECRET ?? localAuthJwtSecret,
    authAccessTokenTtlSeconds: parsed.data.AUTH_ACCESS_TOKEN_TTL_SECONDS,
    apiBodyLimitBytes: parsed.data.API_BODY_LIMIT_BYTES,
    apiRateLimitWindowSeconds: parsed.data.API_RATE_LIMIT_WINDOW_SECONDS,
    apiRateLimitMaxRequests: parsed.data.API_RATE_LIMIT_MAX_REQUESTS,
    apiCorsOrigins: parseCorsOrigins(parsed.data.API_CORS_ORIGINS)
  };
}

function parseCorsOrigins(value: string): readonly string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
