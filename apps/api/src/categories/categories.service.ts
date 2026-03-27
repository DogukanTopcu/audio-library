import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import * as schema from '../../../../packages/db/src/schema/index.js';
import { categories } from '../../../../packages/db/src/schema/index.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

type DB = NodePgDatabase<typeof schema>;

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  orderIndex: number;
  createdAt: Date;
  children: CategoryNode[];
}

@Injectable()
export class CategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  async findAll(): Promise<CategoryNode[]> {
    const allCategories = await this.db.query.categories.findMany({
      orderBy: (cat, { asc }) => [asc(cat.orderIndex)],
    });

    return this.buildTree(allCategories);
  }

  async findOne(id: string) {
    const category = await this.db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    const [created] = await this.db.insert(categories).values({
      name: dto.name,
      slug: dto.slug,
      parentId: dto.parentId,
      description: dto.description,
      orderIndex: dto.orderIndex ?? 0,
    }).returning();

    return created;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.findOne(id);

    const [updated] = await this.db
      .update(categories)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
      })
      .where(eq(categories.id, id))
      .returning();

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    // Recursively delete children first to avoid FK violations
    const children = await this.db.query.categories.findMany({
      where: eq(categories.parentId, id),
    });
    for (const child of children) {
      await this.remove(child.id);
    }

    await this.db.delete(categories).where(eq(categories.id, id));

    return { deleted: true };
  }

  private buildTree(items: any[]): CategoryNode[] {
    const map = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

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
