import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { CatalogModule } from "./catalog/catalog.module.js";
import { ApiConfigModule } from "./config/api-config.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";

@Module({
  imports: [ApiConfigModule, DatabaseModule, HealthModule, AuthModule, CatalogModule]
})
export class AppModule {}
