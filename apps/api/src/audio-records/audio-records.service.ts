import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, asc } from 'drizzle-orm';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import * as schema from '../../../../packages/db/src/schema/index.js';
import { audioRecords } from '../../../../packages/db/src/schema/index.js';
import { CreateAudioRecordDto } from './dto/create-audio-record.dto.js';
import { UpdateAudioRecordDto } from './dto/update-audio-record.dto.js';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class AudioRecordsService {
  private readonly logger = new Logger(AudioRecordsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  async findByChapter(chapterId: string) {
    return this.db.query.audioRecords.findMany({
      where: eq(audioRecords.chapterId, chapterId),
      orderBy: [asc(audioRecords.orderIndex)],
    });
  }

  async findOne(id: string) {
    const record = await this.db.query.audioRecords.findFirst({
      where: eq(audioRecords.id, id),
    });

    if (!record) {
      throw new NotFoundException(`Audio record with id ${id} not found`);
    }

    return record;
  }

  async create(dto: CreateAudioRecordDto) {
    const [created] = await this.db.insert(audioRecords).values({
      chapterId: dto.chapterId,
      title: dto.title,
      type: dto.type,
      bucketKey: dto.bucketKey,
      durationSeconds: dto.durationSeconds,
      orderIndex: dto.orderIndex ?? 0,
    }).returning();

    // Stub: in production, queue an async job for transcript extraction and embedding generation
    this.logger.log(
      `Audio record ${created.id} created. TODO: queue transcript/embedding job.`,
    );

    return created;
  }

  async update(id: string, dto: UpdateAudioRecordDto) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(audioRecords)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.bucketKey !== undefined && { bucketKey: dto.bucketKey }),
        ...(dto.durationSeconds !== undefined && { durationSeconds: dto.durationSeconds }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
      })
      .where(eq(audioRecords.id, id))
      .returning();

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.db.delete(audioRecords).where(eq(audioRecords.id, id));

    return { deleted: true };
  }

  async reorder(id: string, orderIndex: number) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(audioRecords)
      .set({ orderIndex })
      .where(eq(audioRecords.id, id))
      .returning();

    return updated;
  }
}
