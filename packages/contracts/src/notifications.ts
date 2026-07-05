import { z } from "zod";

export const notificationDeliveryRequestSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100)
});

export const notificationDeliveryResponseSchema = z.object({
  scannedNotificationCount: z.number().int().nonnegative(),
  sentNotificationCount: z.number().int().nonnegative(),
  failedNotificationCount: z.number().int().nonnegative(),
  skippedNotificationCount: z.number().int().nonnegative(),
  processedAt: z.iso.datetime()
});

export type NotificationDeliveryRequest = z.infer<typeof notificationDeliveryRequestSchema>;
export type NotificationDeliveryResponse = z.infer<typeof notificationDeliveryResponseSchema>;
