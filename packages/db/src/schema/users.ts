import { index, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { idColumn, lifecycleColumns } from "./common.js";
import { userRoleEnum, userStatusEnum } from "./enums.js";

export const users = pgTable(
  "users",
  {
    id: idColumn(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    status: userStatusEnum("status").notNull().default("pending_verification"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...lifecycleColumns()
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_status_idx").on(table.status),
    index("users_role_idx").on(table.role)
  ]
);
