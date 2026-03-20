import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import * as schema from '../../../../packages/db/src/schema/index.js';
import { auditLogs } from '../../../../packages/db/src/schema/index.js';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class AuditLogService {
  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  async log(params: {
    adminId: string;
    action: string;
    entityType: string;
    entityId?: string;
    beforeState?: any;
    afterState?: any;
    ipAddress?: string;
  }) {
    await this.db.insert(auditLogs).values({
      adminId: params.adminId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeState: params.beforeState ? JSON.stringify(params.beforeState) : null,
      afterState: params.afterState ? JSON.stringify(params.afterState) : null,
      ipAddress: params.ipAddress,
    });
  }
}
