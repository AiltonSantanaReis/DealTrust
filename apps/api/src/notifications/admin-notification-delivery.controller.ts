import {
  type AuthUser,
  type NotificationDeliveryResponse,
  notificationDeliveryRequestSchema,
  notificationDeliveryResponseSchema
} from "@dealtrust/contracts";
import { Body, Controller, HttpCode, Inject, Post, Req } from "@nestjs/common";
import { createAuditRequestContext } from "../audit/audit-request-context.js";
import type { AuthenticatedRequest } from "../auth/authenticated-request.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { RequireRoles } from "../auth/require-roles.decorator.js";
import { parseRequestBody } from "../shared/validation.js";
import { NotificationDeliveryService } from "./notification-delivery.service.js";

@Controller("admin/notifications/send-pending")
@RequireRoles("admin", "owner")
export class AdminNotificationDeliveryController {
  constructor(
    @Inject(NotificationDeliveryService)
    private readonly notificationDeliveryService: NotificationDeliveryService
  ) {}

  @Post()
  @HttpCode(200)
  async sendPending(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
    @Req() request: AuthenticatedRequest
  ): Promise<NotificationDeliveryResponse> {
    const parsedBody = parseRequestBody(notificationDeliveryRequestSchema, body);
    const response = await this.notificationDeliveryService.processPendingEmails(parsedBody, {
      actor: user,
      request: createAuditRequestContext(request)
    });

    return notificationDeliveryResponseSchema.parse(response);
  }
}
