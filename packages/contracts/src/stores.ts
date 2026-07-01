import { z } from "zod";
import { paginationQuerySchema, publicIdSchema } from "./common.js";

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(253)
  .regex(/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/);

export const storeStatusSchema = z.enum(["pending_review", "active", "blocked", "archived"]);
export const storeTypeSchema = z.enum(["marketplace", "retailer", "direct"]);

export const createAdminStoreRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  domain: domainSchema,
  reputationScore: z.number().int().min(0).max(100).default(0),
  status: storeStatusSchema.default("pending_review"),
  type: storeTypeSchema.default("retailer")
});

export const updateAdminStoreRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    domain: domainSchema.optional(),
    reputationScore: z.number().int().min(0).max(100).optional(),
    status: storeStatusSchema.optional(),
    type: storeTypeSchema.optional()
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one store field must be provided."
  });

export const adminStoreListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(120).optional(),
  status: storeStatusSchema.optional(),
  type: storeTypeSchema.optional()
});

export const adminStoreResponseSchema = z.object({
  id: publicIdSchema,
  name: z.string().min(2).max(120),
  domain: domainSchema,
  reputationScore: z.number().int().min(0).max(100),
  status: storeStatusSchema,
  type: storeTypeSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const adminStoreListResponseSchema = z.object({
  items: z.array(adminStoreResponseSchema)
});

export type StoreStatus = z.infer<typeof storeStatusSchema>;
export type StoreType = z.infer<typeof storeTypeSchema>;
export type CreateAdminStoreRequest = z.infer<typeof createAdminStoreRequestSchema>;
export type UpdateAdminStoreRequest = z.infer<typeof updateAdminStoreRequestSchema>;
export type AdminStoreListQuery = z.infer<typeof adminStoreListQuerySchema>;
export type AdminStoreResponse = z.infer<typeof adminStoreResponseSchema>;
export type AdminStoreListResponse = z.infer<typeof adminStoreListResponseSchema>;
