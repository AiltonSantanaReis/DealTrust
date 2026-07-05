import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { ApiConfigModule } from "../config/api-config.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminNotificationDeliveryController } from "./admin-notification-delivery.controller.js";
import { EmailDeliveryService } from "./email-delivery.service.js";
import { NotificationDeliveryService } from "./notification-delivery.service.js";

@Module({
  imports: [ApiConfigModule, AuthModule, AuditModule, DatabaseModule],
  controllers: [AdminNotificationDeliveryController],
  providers: [EmailDeliveryService, NotificationDeliveryService]
})
export class NotificationsModule {}
