import {
    pgTable, uuid, text, timestamp, pgEnum, jsonb, integer, boolean, varchar
  } from "drizzle-orm/pg-core";
  import { relations } from "drizzle-orm";
  import { users } from "./users";
  import { audioRecords } from "./content";
  
  export const messageRoleEnum = pgEnum("message_role", ["USER", "ASSISTANT", "SYSTEM"]);
  export const messageIntentEnum = pgEnum("message_intent", [
    "SEARCH", "NAVIGATE_NEXT", "NAVIGATE_PREV", "NAVIGATE_CHAPTER",
    "GET_PROGRESS", "RECOMMEND", "GENERAL_QA",
  ]);
  export const paceLevelEnum = pgEnum("pace_level", ["SLOW", "NORMAL", "FAST"]);
  export const encouragementLevelEnum = pgEnum("encouragement_level", [
    "MINIMAL", "MODERATE", "HIGH",
  ]);
  
  export const userAgentProfiles = pgTable("user_agent_profiles", {
    id:                      uuid("id").primaryKey().defaultRandom(),
    userId:                  uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    preferredPace:           paceLevelEnum("preferred_pace").default("NORMAL").notNull(),
    encouragementLevel:      encouragementLevelEnum("encouragement_level").default("MODERATE").notNull(),
    prefersDetail:           boolean("prefers_detail").default(false).notNull(),
    sessionCount:            integer("session_count").default(0).notNull(),
    avgSessionDurationSecs:  integer("avg_session_duration_seconds").default(0).notNull(),
    lastStruggledTopic:      text("last_struggled_topic"),
    updatedAt:               timestamp("updated_at").defaultNow().notNull(),
  });
  
  export const agentSessions = pgTable("agent_sessions", {
    id:                  uuid("id").primaryKey().defaultRandom(),
    userId:              uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    temperamentSnapshot: jsonb("temperament_snapshot"),
    createdAt:           timestamp("created_at").defaultNow().notNull(),
    endedAt:             timestamp("ended_at"),
  });
  
  export const agentMessages = pgTable("agent_messages", {
    id:                     uuid("id").primaryKey().defaultRandom(),
    sessionId:              uuid("session_id").notNull().references(() => agentSessions.id, { onDelete: "cascade" }),
    role:                   messageRoleEnum("role").notNull(),
    content:                text("content").notNull(),
    intent:                 messageIntentEnum("intent"),
    referencedAudioRecordId: uuid("referenced_audio_record_id").references(() => audioRecords.id),
    metadata:               jsonb("metadata"),
    createdAt:              timestamp("created_at").defaultNow().notNull(),
  });
  
  export const userActivityLogs = pgTable("user_activity_logs", {
    id:            uuid("id").primaryKey().defaultRandom(),
    userId:        uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    eventType:     varchar("event_type", { length: 64 }).notNull(),
    contentId:     uuid("content_id"),
    audioRecordId: uuid("audio_record_id"),
    metadata:      jsonb("metadata"),
    createdAt:     timestamp("created_at").defaultNow().notNull(),
  });
  
  export const userProgress = pgTable("user_progress", {
    id:              uuid("id").primaryKey().defaultRandom(),
    userId:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    audioRecordId:   uuid("audio_record_id").notNull().references(() => audioRecords.id),
    positionSeconds: integer("position_seconds").default(0).notNull(),
    isCompleted:     boolean("is_completed").default(false).notNull(),
    updatedAt:       timestamp("updated_at").defaultNow().notNull(),
  });