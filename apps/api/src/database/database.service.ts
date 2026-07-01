import {
  createDatabaseClient,
  createSqlClient,
  type Database,
  type SqlClient
} from "@dealtrust/db";
import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { API_CONFIG, type ApiConfig } from "../config/api-config.js";

export type DatabaseStatus = {
  readonly configured: true;
  readonly maxConnections: number;
};

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: Database;
  private readonly sql: SqlClient;

  constructor(@Inject(API_CONFIG) private readonly config: ApiConfig) {
    this.sql = createSqlClient(config.databaseUrl, {
      max: config.databaseMaxConnections,
      idle_timeout: 20,
      connect_timeout: 10
    });
    this.db = createDatabaseClient(this.sql);
  }

  getStatus(): DatabaseStatus {
    return {
      configured: true,
      maxConnections: this.config.databaseMaxConnections
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.sql.end({ timeout: 1 });
  }
}
