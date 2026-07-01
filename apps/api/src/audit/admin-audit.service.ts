import type {
  AdminAuditLogListQuery,
  AdminAuditLogListResponse,
  AuditAction,
  AuthUser
} from "@dealtrust/contracts";
import { adminAuditLogs, type Database } from "@dealtrust/db";
import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DatabaseService } from "../database/database.service.js";
import { mapAdminAuditLog } from "./admin-audit-log-mapper.js";
import type { AuditRequestContext } from "./audit-request-context.js";

export type AdminActionContext = {
  readonly actor: AuthUser;
  readonly request: AuditRequestContext;
};

export type AdminAuditRecordInput = {
  readonly actor: AuthUser;
  readonly action: AuditAction;
  readonly entityType: string;
  readonly entityId: string;
  readonly request: AuditRequestContext;
  readonly before?: unknown;
  readonly after?: unknown;
};

type AuditWriteExecutor = Pick<Database, "insert">;

@Injectable()
export class AdminAuditService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async record(input: AdminAuditRecordInput): Promise<void> {
    await this.recordWithExecutor(this.database.db, input);
  }

  async recordWithExecutor(
    executor: AuditWriteExecutor,
    input: AdminAuditRecordInput
  ): Promise<void> {
    await executor.insert(adminAuditLogs).values({
      actorUserId: input.actor.id,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: buildMetadata(input)
    });
  }

  async list(query: AdminAuditLogListQuery): Promise<AdminAuditLogListResponse> {
    const filters = [
      query.actorUserId ? eq(adminAuditLogs.actorUserId, query.actorUserId) : undefined,
      query.action ? eq(adminAuditLogs.action, query.action) : undefined,
      query.entityType ? eq(adminAuditLogs.entityType, query.entityType) : undefined,
      query.entityId ? eq(adminAuditLogs.entityId, query.entityId) : undefined
    ].filter((filter) => filter !== undefined);

    const rows = await this.database.db
      .select()
      .from(adminAuditLogs)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
      .limit(query.limit);

    return {
      items: rows.map(mapAdminAuditLog)
    };
  }
}

function buildMetadata(input: AdminAuditRecordInput): Record<string, unknown> {
  return sanitizeRecord({
    schemaVersion: 1,
    actorRole: input.actor.role,
    request: input.request,
    before: input.before,
    after: input.after,
    changes: buildChanges(input.before, input.after)
  });
}

function buildChanges(before: unknown, after: unknown): Record<string, unknown> {
  if (!isPlainRecord(before) || !isPlainRecord(after)) {
    return {};
  }

  const changes: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    const beforeValue = before[key];
    const afterValue = after[key];

    if (
      JSON.stringify(normalizeForComparison(beforeValue)) !==
      JSON.stringify(normalizeForComparison(afterValue))
    ) {
      changes[key] = {
        before: sanitizeValue(beforeValue, key),
        after: sanitizeValue(afterValue, key)
      };
    }
  }

  return changes;
}

function sanitizeRecord(value: Record<string, unknown>): Record<string, unknown> {
  const sanitized = sanitizeValue(value);

  return isPlainRecord(sanitized) ? sanitized : {};
}

function sanitizeValue(value: unknown, key = "", depth = 0): unknown {
  if (isSensitiveKey(key)) {
    return "[REDACTED]";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (depth > 6) {
    return "[MAX_DEPTH]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, key, depth + 1));
  }

  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeValue(entryValue, entryKey, depth + 1)
      ])
    );
  }

  return value;
}

function normalizeForComparison(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function isSensitiveKey(key: string): boolean {
  return /(authorization|cookie|password|secret|session|token)/i.test(key);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
