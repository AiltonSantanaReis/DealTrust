import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminOffersController } from "./admin-offers.controller.js";
import { AdminPriceSnapshotsController } from "./admin-price-snapshots.controller.js";
import { OffersService } from "./offers.service.js";
import { PriceSnapshotsService } from "./price-snapshots.service.js";

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule],
  controllers: [AdminOffersController, AdminPriceSnapshotsController],
  providers: [OffersService, PriceSnapshotsService]
})
export class OffersModule {}
