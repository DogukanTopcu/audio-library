import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, like, sql, asc, desc, count, ilike } from 'drizzle-orm';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import * as schema from '@repo/db/schema';
import { content, contentCategories, chapters } from '@repo/db/schema';
import { CreateContentDto } from './dto/create-content.dto.js';
import { UpdateContentDto } from './dto/update-content.dto.js';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class ContentService {
  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  async findAll(
    pagination: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' },
    filters?: { type?: string; categoryId?: string; isActive?: boolean; search?: string },
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (filters?.type) {
      conditions.push(eq(content.type, filters.type as any));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(content.isActive, filters.isActive));
    }
    if (filters?.search) {
      conditions.push(ilike(content.title, `%${filters.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(content)
      .where(whereClause);

    const total = totalResult.count;

    const orderFn = pagination.sortOrder === 'asc' ? asc : desc;
    const sortColumn = (content as any)[pagination.sortBy ?? 'createdAt'] ?? content.createdAt;

    const data = await this.db.query.content.findMany({
      where: whereClause,
      orderBy: [orderFn(sortColumn)],
      limit,
      offset,
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
    const item = await this.db.query.content.findFirst({
      where: eq(content.id, id),
    });

    if (!item) {
      throw new NotFoundException(`Content with id ${id} not found`);
    }

    // Fetch chapters for this content and build tree
    const allChapters = await this.db.query.chapters.findMany({
      where: eq(chapters.contentId, id),
      orderBy: [asc(chapters.orderIndex)],
    });

    // Fetch associated categories
    const cats = await this.db
      .select()
      .from(contentCategories)
      .where(eq(contentCategories.contentId, id));

    return {
      ...item,
      chapters: this.buildChapterTree(allChapters),
      categoryIds: cats.map((c) => c.categoryId),
    };
  }

  async create(dto: CreateContentDto) {
    const [created] = await this.db.insert(content).values({
      title: dto.title,
      type: dto.type,
      description: dto.description,
      author: dto.author,
      publisher: dto.publisher,
      coverImageKey: dto.coverImageKey,
      metadata: dto.metadata,
    }).returning();

    return created;
  }

  async update(id: string, dto: UpdateContentDto) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(content)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.author !== undefined && { author: dto.author }),
        ...(dto.publisher !== undefined && { publisher: dto.publisher }),
        ...(dto.coverImageKey !== undefined && { coverImageKey: dto.coverImageKey }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        updatedAt: new Date(),
      })
      .where(eq(content.id, id))
      .returning();

    return updated;
  }

  async softDelete(id: string) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(content)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(content.id, id))
      .returning();

    return updated;
  }

  async assignCategories(contentId: string, categoryIds: string[]) {
    await this.findOne(contentId);

    // Delete existing associations
    await this.db
      .delete(contentCategories)
      .where(eq(contentCategories.contentId, contentId));

    // Insert new associations
    if (categoryIds.length > 0) {
      await this.db.insert(contentCategories).values(
        categoryIds.map((categoryId) => ({
          contentId,
          categoryId,
        })),
      );
    }

    return { contentId, categoryIds };
  }

  private buildChapterTree(items: any[]): any[] {
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const item of items) {
      map.set(item.id, { ...item, children: [] });
    }

    for (const item of items) {
      const node = map.get(item.id)!;
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
