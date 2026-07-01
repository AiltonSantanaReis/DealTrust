import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { PriceAlertsController } from "./price-alerts.controller.js";
import { PriceAlertsService } from "./price-alerts.service.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [PriceAlertsController],
  providers: [PriceAlertsService]
})
export class AlertsModule {}
