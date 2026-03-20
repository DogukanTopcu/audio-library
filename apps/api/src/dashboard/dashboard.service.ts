import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, count, desc } from 'drizzle-orm';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import * as schema from '../../../../packages/db/src/schema/index.js';
import { users, content, audioRecords } from '../../../../packages/db/src/schema/index.js';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  async getStats() {
    const [totalUsersResult] = await this.db
      .select({ count: count() })
      .from(users);

    const [pendingVerificationResult] = await this.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'PENDING_VERIFICATION'));

    const [totalContentResult] = await this.db
      .select({ count: count() })
      .from(content);

    const [totalAudioRecordsResult] = await this.db
      .select({ count: count() })
      .from(audioRecords);

    return {
      totalUsers: totalUsersResult.count,
      pendingVerification: pendingVerificationResult.count,
      totalContent: totalContentResult.count,
      totalAudioRecords: totalAudioRecordsResult.count,
    };
  }

  async getRecentRegistrations() {
    const recentUsers = await this.db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
      limit: 5,
      columns: {
        passwordHash: false,
      },
    });

    return recentUsers;
  }

  async getPendingVerifications() {
    const pendingUsers = await this.db.query.users.findMany({
      where: eq(users.status, 'PENDING_VERIFICATION'),
      orderBy: [desc(users.createdAt)],
      columns: {
        passwordHash: false,
      },
    });

    return pendingUsers;
  }
}
