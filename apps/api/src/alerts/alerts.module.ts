import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminPriceAlertVerificationController } from "./admin-price-alert-verification.controller.js";
import { PriceAlertVerificationService } from "./price-alert-verification.service.js";
import { PriceAlertsController } from "./price-alerts.controller.js";
import { PriceAlertsService } from "./price-alerts.service.js";

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule],
  controllers: [AdminPriceAlertVerificationController, PriceAlertsController],
  providers: [PriceAlertVerificationService, PriceAlertsService]
})
export class AlertsModule {}
