import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, asc, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import * as schema from '../../../../packages/db/src/schema/index.js';
import {
  chapters,
  audioRecords,
  questions,
  questionChoices,
} from '../../../../packages/db/src/schema/index.js';
import { CreateChapterDto } from './dto/create-chapter.dto.js';
import { UpdateChapterDto } from './dto/update-chapter.dto.js';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class ChaptersService {
  private readonly logger = new Logger(ChaptersService.name);

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
    await this.removeRecursive(id);
    return { deleted: true };
  }

  /**
   * Recursively delete a chapter and all its descendants.
   * Handles FK constraints by deleting in the correct order:
   * 1. Recurse into child chapters first
   * 2. For this chapter: delete question_choices → questions → user_progress → audio_records
   * 3. Delete the chapter itself
   */
  private async removeRecursive(chapterId: string) {
    // 1. Find and recursively delete all child chapters
    const children = await this.db.query.chapters.findMany({
      where: eq(chapters.parentId, chapterId),
    });
    for (const child of children) {
      await this.removeRecursive(child.id);
    }

    // 2. Get audio record IDs for this chapter
    const chapterAudios = await this.db.query.audioRecords.findMany({
      where: eq(audioRecords.chapterId, chapterId),
      columns: { id: true },
    });
    const audioIds = chapterAudios.map((a) => a.id);

    // 3. Get question IDs for this chapter
    const chapterQuestions = await this.db.query.questions.findMany({
      where: eq(questions.chapterId, chapterId),
      columns: { id: true },
    });
    const questionIds = chapterQuestions.map((q) => q.id);

    // 4. Delete question choices (references questions and audioRecords)
    if (questionIds.length > 0) {
      await this.db.delete(questionChoices).where(
        inArray(questionChoices.questionId, questionIds),
      );
    }

    // 5. Delete questions (references chapterId and audioRecordId)
    if (questionIds.length > 0) {
      await this.db.delete(questions).where(
        inArray(questions.id, questionIds),
      );
    }

    // 6. Delete user progress (references audioRecordId, no cascade)
    if (audioIds.length > 0) {
      await this.db.delete(schema.userProgress).where(
        inArray(schema.userProgress.audioRecordId, audioIds),
      );
    }

    // 7. Delete audio records (cascade from chapter, but we do it explicitly to be safe)
    if (audioIds.length > 0) {
      await this.db.delete(audioRecords).where(
        inArray(audioRecords.id, audioIds),
      );
    }

    // 8. Delete the chapter itself
    await this.db.delete(chapters).where(eq(chapters.id, chapterId));

    this.logger.log(`Deleted chapter ${chapterId} with ${audioIds.length} audio records, ${questionIds.length} questions`);
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
