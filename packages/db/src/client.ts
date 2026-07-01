import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema/index.js";

export type Database = PostgresJsDatabase<typeof schema>;
export type SqlClient = Sql;

export type CreateSqlClientOptions = {
  readonly max?: number;
  readonly idle_timeout?: number;
  readonly connect_timeout?: number;
};

export function createSqlClient(
  databaseUrl: string,
  options: CreateSqlClientOptions = {}
): SqlClient {
  return postgres(databaseUrl, options);
}

export function createDatabaseClient(sqlClient: SqlClient): Database {
  return drizzle(sqlClient, { schema });
}
