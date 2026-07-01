import { z } from "zod";
import { moneySchema, paginationQuerySchema, publicIdSchema } from "./common.js";

export const productStatusSchema = z.enum(["draft", "active", "blocked", "archived"]);

export const createProductRequestSchema = z.object({
  name: z.string().trim().min(2).max(180),
  brandName: z.string().trim().min(1).max(120),
  categoryId: publicIdSchema,
  model: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional()
});

export const createProductVariantRequestSchema = z.object({
  productId: publicIdSchema,
  color: z.string().trim().min(1).max(80).optional(),
  voltage: z.enum(["110v", "220v", "bivolt"]).optional(),
  memory: z.string().trim().min(1).max(80).optional(),
  size: z.string().trim().min(1).max(80).optional(),
  edition: z.string().trim().min(1).max(120).optional()
});

export const createAdminProductVariantRequestSchema = createProductVariantRequestSchema.extend({
  status: productStatusSchema.default("active")
});

export const updateAdminProductVariantRequestSchema = z
  .object({
    color: z.string().trim().min(1).max(80).nullable().optional(),
    voltage: z.enum(["110v", "220v", "bivolt"]).nullable().optional(),
    memory: z.string().trim().min(1).max(80).nullable().optional(),
    size: z.string().trim().min(1).max(80).nullable().optional(),
    edition: z.string().trim().min(1).max(120).nullable().optional(),
    status: productStatusSchema.optional()
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one product variant field must be provided."
  });

export const createAdminProductRequestSchema = z.object({
  categoryId: publicIdSchema,
  brandId: publicIdSchema,
  name: z.string().trim().min(2).max(180),
  model: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.url().optional(),
  status: productStatusSchema.default("draft")
});

export const updateAdminProductRequestSchema = z
  .object({
    categoryId: publicIdSchema.optional(),
    brandId: publicIdSchema.optional(),
    name: z.string().trim().min(2).max(180).optional(),
    model: z.string().trim().min(1).max(120).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    imageUrl: z.url().nullable().optional(),
    status: productStatusSchema.optional()
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one product field must be provided."
  });

export const productSearchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(120).optional(),
  categoryId: publicIdSchema.optional(),
  brandName: z.string().trim().min(1).max(120).optional()
});

export const productDetailQuerySchema = z.object({
  historyDays: z.coerce.number().int().min(1).max(365).default(90),
  historyLimit: z.coerce.number().int().min(1).max(500).default(120)
});

export const adminProductListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(120).optional(),
  categoryId: publicIdSchema.optional(),
  brandId: publicIdSchema.optional(),
  status: productStatusSchema.optional()
});

export const adminProductResponseSchema = z.object({
  id: publicIdSchema,
  categoryId: publicIdSchema,
  brandId: publicIdSchema,
  name: z.string().min(2).max(180),
  model: z.string().max(120).nullable(),
  description: z.string().max(2000).nullable(),
  imageUrl: z.url().nullable(),
  status: productStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const adminProductListResponseSchema = z.object({
  items: z.array(adminProductResponseSchema)
});

export const adminProductVariantListQuerySchema = paginationQuerySchema.extend({
  productId: publicIdSchema.optional(),
  status: productStatusSchema.optional()
});

export const adminProductVariantResponseSchema = z.object({
  id: publicIdSchema,
  productId: publicIdSchema,
  color: z.string().max(80).nullable(),
  voltage: z.string().max(20).nullable(),
  memory: z.string().max(80).nullable(),
  size: z.string().max(80).nullable(),
  edition: z.string().max(120).nullable(),
  status: productStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const adminProductVariantListResponseSchema = z.object({
  items: z.array(adminProductVariantResponseSchema)
});

export const priceOpportunityLabelSchema = z.enum([
  "historical_low",
  "good_opportunity",
  "regular_price",
  "wait",
  "insufficient_history",
  "inconsistent_discount"
]);

export const publicProductBrandSchema = z.object({
  id: publicIdSchema,
  name: z.string().min(1).max(120),
  slug: z.string().min(2).max(160)
});

export const publicProductCategorySchema = z.object({
  id: publicIdSchema,
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(160)
});

export const publicProductVariantSchema = z.object({
  id: publicIdSchema,
  color: z.string().max(80).nullable(),
  voltage: z.string().max(20).nullable(),
  memory: z.string().max(80).nullable(),
  size: z.string().max(80).nullable(),
  edition: z.string().max(120).nullable()
});

export const publicProductOfferSchema = z.object({
  id: publicIdSchema,
  variantId: publicIdSchema,
  store: z.object({
    id: publicIdSchema,
    name: z.string().min(2).max(120),
    domain: z.string().min(3).max(253),
    reputationScore: z.number().int().min(0).max(100)
  }),
  url: z.url(),
  price: moneySchema,
  shipping: moneySchema,
  finalPrice: moneySchema,
  inStock: z.boolean(),
  lastSeenAt: z.iso.datetime().nullable()
});

export const publicProductPriceSnapshotSchema = z.object({
  offerId: publicIdSchema,
  capturedAt: z.iso.datetime(),
  price: moneySchema,
  shipping: moneySchema,
  couponDiscount: moneySchema,
  confirmedCashback: moneySchema,
  finalPrice: moneySchema,
  available: z.boolean()
});

export const publicProductPriceAnalysisSchema = z.object({
  label: priceOpportunityLabelSchema,
  currentPrice: moneySchema.nullable(),
  averagePrice: moneySchema.nullable(),
  historicalLow: moneySchema.nullable(),
  discountFromAveragePercent: z.number().nullable(),
  snapshotCount: z.number().int().nonnegative()
});

export const publicProductPriceWindowSchema = z.object({
  days: z.union([z.literal(7), z.literal(30), z.literal(90), z.literal(180)]),
  snapshotCount: z.number().int().nonnegative(),
  latestSnapshotAt: z.iso.datetime().nullable(),
  analysis: publicProductPriceAnalysisSchema
});

export const publicProductSummarySchema = z.object({
  id: publicIdSchema,
  name: z.string().min(2).max(180),
  model: z.string().max(120).nullable(),
  imageUrl: z.url().nullable(),
  brand: publicProductBrandSchema,
  category: publicProductCategorySchema,
  lowestOffer: publicProductOfferSchema.nullable(),
  offerCount: z.number().int().nonnegative(),
  inStockOfferCount: z.number().int().nonnegative()
});

export const productSearchResponseSchema = z.object({
  items: z.array(publicProductSummarySchema)
});

export const publicProductDetailResponseSchema = publicProductSummarySchema.extend({
  description: z.string().max(2000).nullable(),
  variants: z.array(publicProductVariantSchema),
  offers: z.array(publicProductOfferSchema),
  priceHistory: z.array(publicProductPriceSnapshotSchema),
  priceWindows: z.array(publicProductPriceWindowSchema),
  priceAnalysis: publicProductPriceAnalysisSchema
});

export type ProductStatus = z.infer<typeof productStatusSchema>;
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
export type CreateProductVariantRequest = z.infer<typeof createProductVariantRequestSchema>;
export type CreateAdminProductVariantRequest = z.infer<
  typeof createAdminProductVariantRequestSchema
>;
export type UpdateAdminProductVariantRequest = z.infer<
  typeof updateAdminProductVariantRequestSchema
>;
export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>;
export type ProductDetailQuery = z.infer<typeof productDetailQuerySchema>;
export type CreateAdminProductRequest = z.infer<typeof createAdminProductRequestSchema>;
export type UpdateAdminProductRequest = z.infer<typeof updateAdminProductRequestSchema>;
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;
export type AdminProductResponse = z.infer<typeof adminProductResponseSchema>;
export type AdminProductListResponse = z.infer<typeof adminProductListResponseSchema>;
export type AdminProductVariantListQuery = z.infer<typeof adminProductVariantListQuerySchema>;
export type AdminProductVariantResponse = z.infer<typeof adminProductVariantResponseSchema>;
export type AdminProductVariantListResponse = z.infer<typeof adminProductVariantListResponseSchema>;
export type PriceOpportunityLabel = z.infer<typeof priceOpportunityLabelSchema>;
export type PublicProductOffer = z.infer<typeof publicProductOfferSchema>;
export type PublicProductPriceSnapshot = z.infer<typeof publicProductPriceSnapshotSchema>;
export type PublicProductPriceWindow = z.infer<typeof publicProductPriceWindowSchema>;
export type PublicProductSummary = z.infer<typeof publicProductSummarySchema>;
export type ProductSearchResponse = z.infer<typeof productSearchResponseSchema>;
export type PublicProductDetailResponse = z.infer<typeof publicProductDetailResponseSchema>;
