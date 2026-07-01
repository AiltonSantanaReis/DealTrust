import { Inject, Injectable } from "@nestjs/common";
import { API_CONFIG, type ApiConfig } from "../config/api-config.js";
import { DatabaseService } from "../database/database.service.js";

export type HealthResponse = {
  readonly status: "ok";
  readonly service: "dealtrust-api";
  readonly environment: ApiConfig["environment"];
  readonly uptimeSeconds: number;
  readonly timestamp: string;
  readonly dependencies: {
    readonly database: ReturnType<DatabaseService["getStatus"]>;
    readonly valkey: {
      readonly configured: true;
    };
  };
};

@Injectable()
export class HealthService {
  constructor(
    @Inject(API_CONFIG) private readonly config: ApiConfig,
    @Inject(DatabaseService) private readonly databaseService: DatabaseService
  ) {}

  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "dealtrust-api",
      environment: this.config.environment,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        database: this.databaseService.getStatus(),
        valkey: {
          configured: true
        }
      }
    };
  }
}
