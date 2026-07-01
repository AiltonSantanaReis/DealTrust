import { z } from "zod";
import { moneySchema, paginationQuerySchema, publicIdSchema } from "./common.js";

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

const optionalDateSchema = z.coerce.date().optional();

export const createAdminOfferRequestSchema = z.object({
  productVariantId: publicIdSchema,
  storeId: publicIdSchema,
  dataSourceId: publicIdSchema.optional(),
  url: z.url(),
  currentPrice: moneySchema,
  shipping: moneySchema.optional(),
  inStock: z.boolean().default(true),
  status: offerStatusSchema.default("active"),
  lastSeenAt: optionalDateSchema
});

export const updateAdminOfferRequestSchema = z
  .object({
    productVariantId: publicIdSchema.optional(),
    storeId: publicIdSchema.optional(),
    dataSourceId: publicIdSchema.nullable().optional(),
    url: z.url().optional(),
    currentPrice: moneySchema.optional(),
    shipping: moneySchema.optional(),
    inStock: z.boolean().optional(),
    status: offerStatusSchema.optional(),
    lastSeenAt: z.coerce.date().nullable().optional()
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one offer field must be provided."
  });

export const adminOfferListQuerySchema = paginationQuerySchema.extend({
  productVariantId: publicIdSchema.optional(),
  storeId: publicIdSchema.optional(),
  status: offerStatusSchema.optional()
});

export const adminOfferResponseSchema = z.object({
  id: publicIdSchema,
  productVariantId: publicIdSchema,
  storeId: publicIdSchema,
  dataSourceId: publicIdSchema.nullable(),
  url: z.url(),
  currentPrice: moneySchema,
  shipping: moneySchema,
  inStock: z.boolean(),
  status: offerStatusSchema,
  lastSeenAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const adminOfferListResponseSchema = z.object({
  items: z.array(adminOfferResponseSchema)
});

export const createAdminPriceSnapshotRequestSchema = createPriceSnapshotRequestSchema.extend({
  couponDiscount: moneySchema.optional(),
  confirmedCashback: moneySchema.optional()
});

export const adminPriceSnapshotListQuerySchema = paginationQuerySchema.extend({
  offerId: publicIdSchema.optional()
});

export const adminPriceSnapshotResponseSchema = z.object({
  id: publicIdSchema,
  offerId: publicIdSchema,
  price: moneySchema,
  shipping: moneySchema,
  couponCode: z.string().max(80).nullable(),
  couponDiscount: moneySchema,
  confirmedCashback: moneySchema,
  available: z.boolean(),
  capturedAt: z.iso.datetime()
});

export const adminPriceSnapshotListResponseSchema = z.object({
  items: z.array(adminPriceSnapshotResponseSchema)
});

export type OfferStatus = z.infer<typeof offerStatusSchema>;
export type CreateOfferRequest = z.infer<typeof createOfferRequestSchema>;
export type CreatePriceSnapshotRequest = z.infer<typeof createPriceSnapshotRequestSchema>;
export type CreateAdminOfferRequest = z.infer<typeof createAdminOfferRequestSchema>;
export type UpdateAdminOfferRequest = z.infer<typeof updateAdminOfferRequestSchema>;
export type AdminOfferListQuery = z.infer<typeof adminOfferListQuerySchema>;
export type AdminOfferResponse = z.infer<typeof adminOfferResponseSchema>;
export type AdminOfferListResponse = z.infer<typeof adminOfferListResponseSchema>;
export type CreateAdminPriceSnapshotRequest = z.infer<typeof createAdminPriceSnapshotRequestSchema>;
export type AdminPriceSnapshotListQuery = z.infer<typeof adminPriceSnapshotListQuerySchema>;
export type AdminPriceSnapshotResponse = z.infer<typeof adminPriceSnapshotResponseSchema>;
export type AdminPriceSnapshotListResponse = z.infer<typeof adminPriceSnapshotListResponseSchema>;
