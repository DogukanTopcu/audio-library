import {
    pgTable, uuid, varchar, integer, boolean, timestamp,
    pgEnum, text, jsonb, vector, index
  } from "drizzle-orm/pg-core";
  import { relations } from "drizzle-orm";
  
  export const contentTypeEnum = pgEnum("content_type", [
    "TEXTBOOK", "NOVEL", "PRACTICE_TEST", "QUESTION_BANK", "OTHER",
  ]);
  
  export const audioTypeEnum = pgEnum("audio_type", [
    "TOPIC_INTRO", "QUESTION", "EXPLANATION", "STORY_PASSAGE", "OTHER",
  ]);
  
  export const difficultyEnum = pgEnum("difficulty_level", [
    "EASY", "MEDIUM", "HARD",
  ]);
  
  // ── Categories (recursive) ───────────────────────────────────────────
  export const categories = pgTable("categories", {
    id:          uuid("id").primaryKey().defaultRandom(),
    name:        varchar("name", { length: 255 }).notNull(),
    slug:        varchar("slug", { length: 255 }).notNull().unique(),
    parentId:    uuid("parent_id").references((): any => categories.id),
    description: text("description"),
    orderIndex:  integer("order_index").default(0).notNull(),
    createdAt:   timestamp("created_at").defaultNow().notNull(),
  });
  
  export const categoriesRelations = relations(categories, ({ one, many }) => ({
    parent:   one(categories, { fields: [categories.parentId], references: [categories.id] }),
    children: many(categories),
    contentCategories: many(contentCategories),
  }));
  
  // ── Content ──────────────────────────────────────────────────────────
  export const content = pgTable("content", {
    id:             uuid("id").primaryKey().defaultRandom(),
    title:          varchar("title", { length: 512 }).notNull(),
    type:           contentTypeEnum("type").notNull(),
    description:    text("description"),
    author:         varchar("author", { length: 255 }),
    publisher:      varchar("publisher", { length: 255 }),
    // GCP path — e.g. "images/content/{id}/cover.jpg"
    coverImageKey:  varchar("cover_image_key", { length: 512 }),
    isActive:       boolean("is_active").default(true).notNull(),
    metadata:       jsonb("metadata"),
    createdAt:      timestamp("created_at").defaultNow().notNull(),
    updatedAt:      timestamp("updated_at").defaultNow().notNull(),
  });
  
  export const contentCategories = pgTable("content_categories", {
    contentId:  uuid("content_id").notNull().references(() => content.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  });
  
  // ── Chapters (recursive — chapter can contain sub-chapters) ──────────
  export const chapters = pgTable("chapters", {
    id:         uuid("id").primaryKey().defaultRandom(),
    contentId:  uuid("content_id").notNull().references(() => content.id, { onDelete: "cascade" }),
    parentId:   uuid("parent_id").references((): any => chapters.id),
    title:      varchar("title", { length: 512 }).notNull(),
    orderIndex: integer("order_index").default(0).notNull(),
    description: text("description"),
    createdAt:  timestamp("created_at").defaultNow().notNull(),
  });
  
  export const chaptersRelations = relations(chapters, ({ one, many }) => ({
    content:      one(content, { fields: [chapters.contentId], references: [content.id] }),
    parent:       one(chapters, { fields: [chapters.parentId], references: [chapters.id] }),
    subChapters:  many(chapters),
    audioRecords: many(audioRecords),
  }));
  
  // ── Audio Records ────────────────────────────────────────────────────
  export const audioRecords = pgTable("audio_records", {
    id:              uuid("id").primaryKey().defaultRandom(),
    chapterId:       uuid("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
    title:           varchar("title", { length: 512 }).notNull(),
    type:            audioTypeEnum("type").notNull(),
    // GCP path — e.g. "audio/{content_id}/{chapter_id}/{id}.mp3"
    bucketKey:       varchar("bucket_key", { length: 512 }).notNull(),
    durationSeconds: integer("duration_seconds"),
    orderIndex:      integer("order_index").default(0).notNull(),
    transcript:      text("transcript"),
    // pgvector — 1536 dims matches text-embedding-004 (Google) or text-embedding-3-small (OpenAI)
    embedding:       vector("embedding", { dimensions: 1536 }),
    metadata:        jsonb("metadata"),
    createdAt:       timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // HNSW index for fast approximate nearest-neighbor search
    embeddingIdx: index("audio_records_embedding_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops")),
  }));
  
  // ── Questions & Choices ──────────────────────────────────────────────
  export const questions = pgTable("questions", {
    id:                       uuid("id").primaryKey().defaultRandom(),
    audioRecordId:            uuid("audio_record_id").notNull().references(() => audioRecords.id),
    explanationAudioRecordId: uuid("explanation_audio_record_id").references(() => audioRecords.id),
    chapterId:                uuid("chapter_id").notNull().references(() => chapters.id),
    correctChoiceIndex:       integer("correct_choice_index").notNull(),
    orderIndex:               integer("order_index").default(0).notNull(),
    difficultyLevel:          difficultyEnum("difficulty_level"),
    topicTags:                text("topic_tags").array(),
    createdAt:                timestamp("created_at").defaultNow().notNull(),
  });
  
  export const questionChoices = pgTable("question_choices", {
    id:            uuid("id").primaryKey().defaultRandom(),
    questionId:    uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    choiceIndex:   integer("choice_index").notNull(),
    audioRecordId: uuid("audio_record_id").notNull().references(() => audioRecords.id),
    choiceText:    text("choice_text"),
  });