import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const adminRoleEnum = pgEnum("admin_role", ["SUPERADMIN", "EDITOR"]);

export const admins = pgTable("admins", {
  id:           uuid("id").primaryKey().defaultRandom(),
  email:        varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name:         varchar("name", { length: 255 }).notNull(),
  role:         adminRoleEnum("role").default("EDITOR").notNull(),
  createdBy:    uuid("created_by").references((): any => admins.id),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export const adminsRelations = relations(admins, ({ one, many }) => ({
  creator:     one(admins, { fields: [admins.createdBy], references: [admins.id] }),
  auditLogs:   many(auditLogs),
}));

export const auditLogs = pgTable("audit_logs", {
  id:          uuid("id").primaryKey().defaultRandom(),
  adminId:     uuid("admin_id").references(() => admins.id),
  action:      varchar("action", { length: 128 }).notNull(),
  entityType:  varchar("entity_type", { length: 64 }).notNull(),
  entityId:    uuid("entity_id"),
  beforeState: varchar("before_state", { length: 4096 }),
  afterState:  varchar("after_state", { length: 4096 }),
  ipAddress:   varchar("ip_address", { length: 64 }),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  admin: one(admins, { fields: [auditLogs.adminId], references: [admins.id] }),
}));