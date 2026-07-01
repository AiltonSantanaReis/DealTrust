import { Module } from "@nestjs/common";
import { AuditModule } from "./audit/audit.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CatalogModule } from "./catalog/catalog.module.js";
import { ApiConfigModule } from "./config/api-config.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { OffersModule } from "./offers/offers.module.js";
import { SecurityModule } from "./security/security.module.js";
import { StoresModule } from "./stores/stores.module.js";

@Module({
  imports: [
    ApiConfigModule,
    SecurityModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    AuditModule,
    CatalogModule,
    OffersModule,
    StoresModule
  ]
})
export class AppModule {}
