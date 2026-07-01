import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { ApiConfigModule } from "./config/api-config.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";

@Module({
  imports: [ApiConfigModule, DatabaseModule, HealthModule, AuthModule]
})
export class AppModule {}
