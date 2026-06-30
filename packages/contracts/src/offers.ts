import { z } from "zod";
import { moneySchema, publicIdSchema } from "./common.js";

export const offerStatusSchema = z.enum(["active", "out_of_stock", "blocked", "expired"]);

export const createOfferRequestSchema = z.object({
  productVariantId: publicIdSchema,
  storeId: publicIdSchema,
  url: z.url(),
  price: moneySchema,
  shipping: moneySchema.optional(),
  couponCode: z.string().trim().min(1).max(80).optional(),
  status: offerStatusSchema.default("active")
});

export const createPriceSnapshotRequestSchema = z.object({
  offerId: publicIdSchema,
  price: moneySchema,
  shipping: moneySchema.optional(),
  couponCode: z.string().trim().min(1).max(80).optional(),
  available: z.boolean(),
  capturedAt: z.coerce.date()
});

export type OfferStatus = z.infer<typeof offerStatusSchema>;
export type CreateOfferRequest = z.infer<typeof createOfferRequestSchema>;
export type CreatePriceSnapshotRequest = z.infer<typeof createPriceSnapshotRequestSchema>;
