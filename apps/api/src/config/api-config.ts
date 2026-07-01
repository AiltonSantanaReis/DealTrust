import { z } from "zod";

export const API_CONFIG = Symbol("API_CONFIG");

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
  VALKEY_URL: redisUrlSchema.default("redis://localhost:6379")
});

export type ApiEnvironment = "development" | "test" | "production";

export type ApiConfig = {
  readonly environment: ApiEnvironment;
  readonly port: number;
  readonly databaseUrl: string;
  readonly databaseMaxConnections: number;
  readonly valkeyUrl: string;
};

export function loadApiConfig(env: NodeJS.ProcessEnv): ApiConfig {
  const parsed = apiConfigSchema.safeParse(env);

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid API configuration: ${errors}`);
  }

  return {
    environment: parsed.data.NODE_ENV,
    port: parsed.data.API_PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    databaseMaxConnections: parsed.data.DATABASE_MAX_CONNECTIONS,
    valkeyUrl: parsed.data.VALKEY_URL
  };
}
