import { z } from "zod";
import { moneySchema, paginationQuerySchema, publicIdSchema } from "./common.js";

const alertBaseSchema = z.object({
  productVariantId: publicIdSchema
});

export const priceAlertTypeSchema = z.enum(["target_price", "drop_percent", "historical_low"]);
export const priceAlertStatusSchema = z.enum(["active", "paused", "triggered", "canceled"]);

export const targetPriceAlertRequestSchema = alertBaseSchema.extend({
  type: z.literal("target_price"),
  targetPrice: moneySchema
});

export const dropPercentAlertRequestSchema = alertBaseSchema.extend({
  type: z.literal("drop_percent"),
  dropPercent: z.number().int().min(1).max(90)
});

export const historicalLowAlertRequestSchema = alertBaseSchema.extend({
  type: z.literal("historical_low")
});

export const createPriceAlertRequestSchema = z.discriminatedUnion("type", [
  targetPriceAlertRequestSchema,
  dropPercentAlertRequestSchema,
  historicalLowAlertRequestSchema
]);

export const priceAlertListQuerySchema = paginationQuerySchema.extend({
  status: priceAlertStatusSchema.optional(),
  productVariantId: publicIdSchema.optional()
});

export const updatePriceAlertRequestSchema = z
  .object({
    status: z.enum(["active", "paused", "canceled"]).optional(),
    targetPrice: moneySchema.optional(),
    dropPercent: z.number().int().min(1).max(90).optional()
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one alert field must be provided."
  });

export const priceAlertResponseSchema = z.object({
  id: publicIdSchema,
  productVariantId: publicIdSchema,
  type: priceAlertTypeSchema,
  targetPrice: moneySchema.nullable(),
  dropPercent: z.number().int().min(1).max(90).nullable(),
  status: priceAlertStatusSchema,
  lastTriggeredAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const priceAlertListResponseSchema = z.object({
  items: z.array(priceAlertResponseSchema)
});

export const priceAlertVerificationReasonSchema = z.enum([
  "target_price_reached",
  "drop_percent_reached",
  "historical_low_reached"
]);

export const priceAlertVerificationRequestSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100)
});

export const priceAlertVerificationTriggeredAlertSchema = z.object({
  id: publicIdSchema,
  productVariantId: publicIdSchema,
  type: priceAlertTypeSchema,
  reason: priceAlertVerificationReasonSchema,
  currentPrice: moneySchema,
  referencePrice: moneySchema.nullable(),
  thresholdPrice: moneySchema.nullable()
});

export const priceAlertVerificationResponseSchema = z.object({
  scannedAlertCount: z.number().int().nonnegative(),
  triggeredAlertCount: z.number().int().nonnegative(),
  notificationCount: z.number().int().nonnegative(),
  skippedAlertCount: z.number().int().nonnegative(),
  processedAt: z.iso.datetime(),
  triggeredAlerts: z.array(priceAlertVerificationTriggeredAlertSchema)
});

export type TargetPriceAlertRequest = z.infer<typeof targetPriceAlertRequestSchema>;
export type DropPercentAlertRequest = z.infer<typeof dropPercentAlertRequestSchema>;
export type HistoricalLowAlertRequest = z.infer<typeof historicalLowAlertRequestSchema>;
export type CreatePriceAlertRequest = z.infer<typeof createPriceAlertRequestSchema>;
export type PriceAlertType = z.infer<typeof priceAlertTypeSchema>;
export type PriceAlertStatus = z.infer<typeof priceAlertStatusSchema>;
export type PriceAlertListQuery = z.infer<typeof priceAlertListQuerySchema>;
export type UpdatePriceAlertRequest = z.infer<typeof updatePriceAlertRequestSchema>;
export type PriceAlertResponse = z.infer<typeof priceAlertResponseSchema>;
export type PriceAlertListResponse = z.infer<typeof priceAlertListResponseSchema>;
export type PriceAlertVerificationReason = z.infer<typeof priceAlertVerificationReasonSchema>;
export type PriceAlertVerificationRequest = z.infer<typeof priceAlertVerificationRequestSchema>;
export type PriceAlertVerificationTriggeredAlert = z.infer<
  typeof priceAlertVerificationTriggeredAlertSchema
>;
export type PriceAlertVerificationResponse = z.infer<typeof priceAlertVerificationResponseSchema>;
