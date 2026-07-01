import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminAuditService } from "./admin-audit.service.js";
import { AdminAuditLogsController } from "./admin-audit-logs.controller.js";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AdminAuditLogsController],
  providers: [AdminAuditService],
  exports: [AdminAuditService]
})
export class AuditModule {}
