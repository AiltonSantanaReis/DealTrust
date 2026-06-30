import { z } from "zod";
import { moneySchema, publicIdSchema } from "./common.js";

const alertBaseSchema = z.object({
  productVariantId: publicIdSchema
});

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

export type TargetPriceAlertRequest = z.infer<typeof targetPriceAlertRequestSchema>;
export type DropPercentAlertRequest = z.infer<typeof dropPercentAlertRequestSchema>;
export type HistoricalLowAlertRequest = z.infer<typeof historicalLowAlertRequestSchema>;
export type CreatePriceAlertRequest = z.infer<typeof createPriceAlertRequestSchema>;
