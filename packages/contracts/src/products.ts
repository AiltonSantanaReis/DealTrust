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

export const productSearchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(120).optional(),
  categoryId: publicIdSchema.optional(),
  brandName: z.string().trim().min(1).max(120).optional(),
  status: productStatusSchema.default("active")
});

export type ProductStatus = z.infer<typeof productStatusSchema>;
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
export type CreateProductVariantRequest = z.infer<typeof createProductVariantRequestSchema>;
export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>;
