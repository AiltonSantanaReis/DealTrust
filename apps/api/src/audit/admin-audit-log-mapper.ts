import type { AdminAuditLogResponse, AuditAction } from "@dealtrust/contracts";

export type AdminAuditLogRow = {
  readonly id: string;
  readonly actorUserId: string;
  readonly action: AuditAction;
  readonly entityType: string;
  readonly entityId: string;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;
};

export function mapAdminAuditLog(row: AdminAuditLogRow): AdminAuditLogResponse {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString()
  };
}
