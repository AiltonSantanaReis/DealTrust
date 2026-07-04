import { z } from "zod";
import { paginationQuerySchema, publicIdSchema } from "./common.js";
import { productStatusSchema } from "./products.js";

export const favoriteListVisibilitySchema = z.enum(["private", "shared"]);

export const createFavoriteListRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  visibility: favoriteListVisibilitySchema.default("private")
});

export const updateFavoriteListRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    visibility: favoriteListVisibilitySchema.optional()
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one favorite list field must be provided."
  });

export const favoriteListQuerySchema = paginationQuerySchema.extend({
  visibility: favoriteListVisibilitySchema.optional()
});

export const favoriteListItemRequestSchema = z.object({
  productVariantId: publicIdSchema
});

export const favoriteListItemResponseSchema = z.object({
  productVariantId: publicIdSchema,
  productId: publicIdSchema,
  productName: z.string().min(2).max(180),
  productStatus: productStatusSchema,
  variant: z.object({
    color: z.string().max(80).nullable(),
    voltage: z.string().max(20).nullable(),
    memory: z.string().max(80).nullable(),
    size: z.string().max(80).nullable(),
    edition: z.string().max(120).nullable(),
    status: productStatusSchema
  }),
  createdAt: z.iso.datetime()
});

export const favoriteListResponseSchema = z.object({
  id: publicIdSchema,
  name: z.string().min(1).max(120),
  visibility: favoriteListVisibilitySchema,
  itemCount: z.number().int().nonnegative(),
  items: z.array(favoriteListItemResponseSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const favoriteListListResponseSchema = z.object({
  items: z.array(favoriteListResponseSchema)
});

export type FavoriteListVisibility = z.infer<typeof favoriteListVisibilitySchema>;
export type CreateFavoriteListRequest = z.infer<typeof createFavoriteListRequestSchema>;
export type UpdateFavoriteListRequest = z.infer<typeof updateFavoriteListRequestSchema>;
export type FavoriteListQuery = z.infer<typeof favoriteListQuerySchema>;
export type FavoriteListItemRequest = z.infer<typeof favoriteListItemRequestSchema>;
export type FavoriteListItemResponse = z.infer<typeof favoriteListItemResponseSchema>;
export type FavoriteListResponse = z.infer<typeof favoriteListResponseSchema>;
export type FavoriteListListResponse = z.infer<typeof favoriteListListResponseSchema>;
