import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, asc } from 'drizzle-orm';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import * as schema from '../../../../packages/db/src/schema/index.js';
import { chapters } from '../../../../packages/db/src/schema/index.js';
import { CreateChapterDto } from './dto/create-chapter.dto.js';
import { UpdateChapterDto } from './dto/update-chapter.dto.js';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class ChaptersService {
  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  async findByContent(contentId: string) {
    const allChapters = await this.db.query.chapters.findMany({
      where: eq(chapters.contentId, contentId),
      orderBy: [asc(chapters.orderIndex)],
    });

    return this.buildTree(allChapters);
  }

  async findOne(id: string) {
    const chapter = await this.db.query.chapters.findFirst({
      where: eq(chapters.id, id),
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with id ${id} not found`);
    }

    return chapter;
  }

  async create(dto: CreateChapterDto) {
    const [created] = await this.db.insert(chapters).values({
      contentId: dto.contentId,
      parentId: dto.parentId,
      title: dto.title,
      orderIndex: dto.orderIndex ?? 0,
      description: dto.description,
    }).returning();

    return created;
  }

  async update(id: string, dto: UpdateChapterDto) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(chapters)
      .set({
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
        ...(dto.description !== undefined && { description: dto.description }),
      })
      .where(eq(chapters.id, id))
      .returning();

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.db.delete(chapters).where(eq(chapters.id, id));

    return { deleted: true };
  }

  async reorder(id: string, orderIndex: number) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(chapters)
      .set({ orderIndex })
      .where(eq(chapters.id, id))
      .returning();

    return updated;
  }

  private buildTree(items: any[]): any[] {
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
