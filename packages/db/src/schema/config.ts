import { pgTable, uuid, varchar, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { admins } from "./admins";

export const configSectionEnum = pgEnum("config_section", [
  "LANDING", "PLAYER", "AGENT", "LEGAL",
]);

export const siteConfigurations = pgTable("site_configurations", {
  id:        uuid("id").primaryKey().defaultRandom(),
  key:       varchar("key", { length: 128 }).notNull().unique(),
  value:     jsonb("value").notNull(),
  section:   configSectionEnum("section").notNull(),
  updatedBy: uuid("updated_by").references(() => admins.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});