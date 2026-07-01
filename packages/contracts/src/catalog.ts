import { z } from "zod";
import { paginationQuerySchema, publicIdSchema } from "./common.js";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const catalogStatusSchema = z.enum(["draft", "active", "blocked", "archived"]);

export const createCategoryRequestSchema = z.object({
  parentId: publicIdSchema.optional(),
  name: z.string().trim().min(2).max(120),
  slug: slugSchema.optional(),
  status: catalogStatusSchema.default("active")
});

export const updateCategoryRequestSchema = z
  .object({
    parentId: publicIdSchema.nullable().optional(),
    name: z.string().trim().min(2).max(120).optional(),
    slug: slugSchema.optional(),
    status: catalogStatusSchema.optional()
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one category field must be provided."
  });

export const categoryResponseSchema = z.object({
  id: publicIdSchema,
  parentId: publicIdSchema.nullable(),
  name: z.string().min(2).max(120),
  slug: slugSchema,
  status: catalogStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const categoryListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(120).optional(),
  status: catalogStatusSchema.optional()
});

export const categoryListResponseSchema = z.object({
  items: z.array(categoryResponseSchema)
});

export const createBrandRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema.optional()
});

export const updateBrandRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    slug: slugSchema.optional()
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one brand field must be provided."
  });

export const brandResponseSchema = z.object({
  id: publicIdSchema,
  name: z.string().min(1).max(120),
  slug: slugSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const brandListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(120).optional()
});

export const brandListResponseSchema = z.object({
  items: z.array(brandResponseSchema)
});

export type CatalogStatus = z.infer<typeof catalogStatusSchema>;
export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>;
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;
export type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;
export type CreateBrandRequest = z.infer<typeof createBrandRequestSchema>;
export type UpdateBrandRequest = z.infer<typeof updateBrandRequestSchema>;
export type BrandResponse = z.infer<typeof brandResponseSchema>;
export type BrandListQuery = z.infer<typeof brandListQuerySchema>;
export type BrandListResponse = z.infer<typeof brandListResponseSchema>;
