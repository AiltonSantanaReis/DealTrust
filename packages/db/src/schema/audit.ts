import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { idColumn } from "./common.js";
import { auditActionEnum } from "./enums.js";
import { users } from "./users.js";

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: idColumn(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: auditActionEnum("action").notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("admin_audit_logs_actor_user_id_idx").on(table.actorUserId),
    index("admin_audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("admin_audit_logs_created_at_idx").on(table.createdAt)
  ]
);
