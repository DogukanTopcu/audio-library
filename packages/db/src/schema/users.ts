import {
    pgTable, uuid, varchar, boolean, timestamp, pgEnum, text
  } from "drizzle-orm/pg-core";
  import { relations } from "drizzle-orm";
  
  export const userStatusEnum = pgEnum("user_status", [
    "PENDING_VERIFICATION",
    "ACTIVE",
    "SUSPENDED",
  ]);
  
  export const users = pgTable("users", {
    id:                       uuid("id").primaryKey().defaultRandom(),
    name:                     varchar("name", { length: 255 }).notNull(),
    email:                    varchar("email", { length: 255 }).notNull().unique(),
    passwordHash:             varchar("password_hash", { length: 255 }).notNull(),
    tcId:                     varchar("tc_id", { length: 11 }).notNull().unique(),
    phoneNumber:              varchar("phone_number", { length: 20 }),
    // GCP bucket path — e.g. "documents/users/{id}/disability-cert.pdf"
    disabilityDocumentKey:    varchar("disability_document_key", { length: 512 }).notNull(),
    isEmailVerified:          boolean("is_email_verified").default(false).notNull(),
    status:                   userStatusEnum("status").default("PENDING_VERIFICATION").notNull(),
    legalConsentAcceptedAt:   timestamp("legal_consent_accepted_at"),
    createdAt:                timestamp("created_at").defaultNow().notNull(),
    updatedAt:                timestamp("updated_at").defaultNow().notNull(),
  });
  
  export const userSessions = pgTable("user_sessions", {
    id:           uuid("id").primaryKey().defaultRandom(),
    userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash:    varchar("token_hash", { length: 512 }).notNull().unique(),
    deviceInfo:   text("device_info"),
    ipAddress:    varchar("ip_address", { length: 64 }),
    expiresAt:    timestamp("expires_at").notNull(),
    lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
    createdAt:    timestamp("created_at").defaultNow().notNull(),
  });
  
  export const usersRelations = relations(users, ({ many }) => ({
    sessions: many(userSessions),
  }));
  
  export const userSessionsRelations = relations(userSessions, ({ one }) => ({
    user: one(users, { fields: [userSessions.userId], references: [users.id] }),
  }));