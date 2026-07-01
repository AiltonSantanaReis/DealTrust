import { z } from "zod";
import { paginationQuerySchema, publicIdSchema } from "./common.js";

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
  brandName: z.string().trim().min(1).max(120).optional(),
  status: productStatusSchema.default("active")
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
export type CreateAdminProductRequest = z.infer<typeof createAdminProductRequestSchema>;
export type UpdateAdminProductRequest = z.infer<typeof updateAdminProductRequestSchema>;
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;
export type AdminProductResponse = z.infer<typeof adminProductResponseSchema>;
export type AdminProductListResponse = z.infer<typeof adminProductListResponseSchema>;
export type AdminProductVariantListQuery = z.infer<typeof adminProductVariantListQuerySchema>;
export type AdminProductVariantResponse = z.infer<typeof adminProductVariantResponseSchema>;
export type AdminProductVariantListResponse = z.infer<typeof adminProductVariantListResponseSchema>;
