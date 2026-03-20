import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import * as schema from '@repo/db/schema';
import { siteConfigurations } from '@repo/db/schema';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class SiteConfigService {
  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  async findAll() {
    const configs = await this.db
      .select()
      .from(siteConfigurations);

    // Group by section
    const grouped: Record<string, Record<string, any>> = {};
    for (const config of configs) {
      if (!grouped[config.section]) {
        grouped[config.section] = {};
      }
      grouped[config.section][config.key] = config.value;
    }

    return grouped;
  }

  async findBySection(section: string) {
    const configs = await this.db
      .select()
      .from(siteConfigurations)
      .where(eq(siteConfigurations.section, section as any));

    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.key] = config.value;
    }

    return result;
  }

  async upsert(
    section: 'LANDING' | 'PLAYER' | 'AGENT' | 'LEGAL',
    updates: Record<string, any>,
    adminId: string,
  ) {
    const results: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      // Try to find existing
      const existing = await this.db
        .select()
        .from(siteConfigurations)
        .where(eq(siteConfigurations.key, key))
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await this.db
          .update(siteConfigurations)
          .set({
            value,
            section,
            updatedBy: adminId,
            updatedAt: new Date(),
          })
          .where(eq(siteConfigurations.key, key))
          .returning();
        results.push(updated);
      } else {
        const [created] = await this.db
          .insert(siteConfigurations)
          .values({
            key,
            value,
            section,
            updatedBy: adminId,
          })
          .returning();
        results.push(created);
      }
    }

    return results;
  }
}
