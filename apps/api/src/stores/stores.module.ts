import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminStoresController } from "./admin-stores.controller.js";
import { StoresService } from "./stores.service.js";

@Module({
  imports: [AuthModule, AuditModule, DatabaseModule],
  controllers: [AdminStoresController],
  providers: [StoresService],
  exports: [StoresService]
})
export class StoresModule {}
