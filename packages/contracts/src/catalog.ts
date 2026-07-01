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

export type CatalogStatus = z.infer<typeof catalogStatusSchema>;
export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>;
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;
export type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;
