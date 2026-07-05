import { randomUUID } from "node:crypto";
import type {
  NotificationDeliveryRequest,
  NotificationDeliveryResponse
} from "@dealtrust/contracts";
import { notifications, users } from "@dealtrust/db";
import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { type AdminActionContext, AdminAuditService } from "../audit/admin-audit.service.js";
import { DatabaseService } from "../database/database.service.js";
import { EmailDeliveryService } from "./email-delivery.service.js";

type PendingEmailNotificationRow = {
  readonly id: string;
  readonly userId: string;
  readonly recipientEmail: string;
  readonly title: string;
  readonly body: string;
};

@Injectable()
export class NotificationDeliveryService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(EmailDeliveryService) private readonly emailDeliveryService: EmailDeliveryService,
    @Inject(AdminAuditService) private readonly adminAuditService: AdminAuditService
  ) {}

  async processPendingEmails(
    input: NotificationDeliveryRequest,
    context?: AdminActionContext
  ): Promise<NotificationDeliveryResponse> {
    const processedAt = new Date();
    const pendingNotifications = await this.selectPendingEmailNotifications(input.limit);
    let sentNotificationCount = 0;
    let failedNotificationCount = 0;
    let skippedNotificationCount = 0;

    for (const notification of pendingNotifications) {
      try {
        await this.emailDeliveryService.sendEmail({
          to: notification.recipientEmail,
          subject: notification.title,
          text: notification.body
        });

        if (await this.markSent(notification.id, processedAt)) {
          sentNotificationCount += 1;
        } else {
          skippedNotificationCount += 1;
        }
      } catch {
        if (await this.markFailed(notification.id, processedAt)) {
          failedNotificationCount += 1;
        } else {
          skippedNotificationCount += 1;
        }
      }
    }

    const response: NotificationDeliveryResponse = {
      scannedNotificationCount: pendingNotifications.length,
      sentNotificationCount,
      failedNotificationCount,
      skippedNotificationCount,
      processedAt: processedAt.toISOString()
    };

    if (context) {
      await this.adminAuditService.record({
        actor: context.actor,
        action: "update",
        entityType: "notification_delivery",
        entityId: randomUUID(),
        request: context.request,
        after: response
      });
    }

    return response;
  }

  private async selectPendingEmailNotifications(
    limit: number
  ): Promise<PendingEmailNotificationRow[]> {
    return this.database.db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        recipientEmail: users.email,
        title: notifications.title,
        body: notifications.body
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.userId, users.id))
      .where(
        and(
          eq(notifications.channel, "email"),
          eq(notifications.status, "pending"),
          eq(users.status, "active")
        )
      )
      .orderBy(asc(notifications.createdAt), asc(notifications.id))
      .limit(limit);
  }

  private async markSent(id: string, processedAt: Date): Promise<boolean> {
    const [updatedNotification] = await this.database.db
      .update(notifications)
      .set({
        status: "sent",
        sentAt: processedAt,
        updatedAt: processedAt
      })
      .where(and(eq(notifications.id, id), eq(notifications.status, "pending")))
      .returning({
        id: notifications.id
      });

    return updatedNotification !== undefined;
  }

  private async markFailed(id: string, processedAt: Date): Promise<boolean> {
    const [updatedNotification] = await this.database.db
      .update(notifications)
      .set({
        status: "failed",
        updatedAt: processedAt
      })
      .where(and(eq(notifications.id, id), eq(notifications.status, "pending")))
      .returning({
        id: notifications.id
      });

    return updatedNotification !== undefined;
  }
}
