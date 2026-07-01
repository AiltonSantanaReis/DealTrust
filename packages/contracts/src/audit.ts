import { z } from "zod";
import { paginationQuerySchema, publicIdSchema } from "./common.js";

export const auditActionSchema = z.enum(["create", "update", "delete", "block"]);

export const adminAuditLogListQuerySchema = paginationQuerySchema.extend({
  actorUserId: publicIdSchema.optional(),
  action: auditActionSchema.optional(),
  entityType: z.string().trim().min(1).max(80).optional(),
  entityId: publicIdSchema.optional()
});

export const adminAuditLogResponseSchema = z.object({
  id: publicIdSchema,
  actorUserId: publicIdSchema,
  action: auditActionSchema,
  entityType: z.string().min(1).max(80),
  entityId: publicIdSchema,
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime()
});

export const adminAuditLogListResponseSchema = z.object({
  items: z.array(adminAuditLogResponseSchema)
});

export type AuditAction = z.infer<typeof auditActionSchema>;
export type AdminAuditLogListQuery = z.infer<typeof adminAuditLogListQuerySchema>;
export type AdminAuditLogResponse = z.infer<typeof adminAuditLogResponseSchema>;
export type AdminAuditLogListResponse = z.infer<typeof adminAuditLogListResponseSchema>;
