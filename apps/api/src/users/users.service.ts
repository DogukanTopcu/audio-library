import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, ilike, count, desc } from 'drizzle-orm';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import * as schema from '@repo/db/schema';
import { users } from '@repo/db/schema';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  async findAll(
    pagination: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' },
    filters?: { status?: string; search?: string },
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (filters?.status) {
      conditions.push(eq(users.status, filters.status as any));
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(users.name, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`),
          ilike(users.tcId, `%${filters.search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const total = totalResult.count;

    const data = await this.db.query.users.findMany({
      where: whereClause,
      orderBy: [desc(users.createdAt)],
      limit,
      offset,
      columns: {
        passwordHash: false,
      },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        passwordHash: false,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async verify(id: string) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(users)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    const { passwordHash, ...result } = updated;
    return result;
  }

  async suspend(id: string) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(users)
      .set({ status: 'SUSPENDED', updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    const { passwordHash, ...result } = updated;
    return result;
  }
}
