import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import { GCP_STORAGE } from '../gcp/gcp.module.js';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import * as schema from '../../../../packages/db/src/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class PlayerService {
  private bucketName: string;

  constructor(
    @Inject(DRIZZLE) private readonly db: DB,
    @Inject(GCP_STORAGE) private readonly storage: Storage,
    private readonly config: ConfigService,
  ) {
    this.bucketName = config.get<string>('GCP_BUCKET_NAME', 'ozan-bayir-assets');
  }

  async getPlayerToken(audioRecordId: string, userId: string) {
    const record = await this.db.query.audioRecords.findFirst({
      where: eq(schema.audioRecords.id, audioRecordId),
    });

    if (!record) throw new NotFoundException('Audio record not found');

    const file = this.storage.bucket(this.bucketName).file(record.bucketKey);
    const [exists] = await file.exists();

    if (!exists) {
      throw new NotFoundException(
        `Audio file is missing from storage for record ${audioRecordId}`,
      );
    }

    // Log activity
    await this.db.insert(schema.userActivityLogs).values({
      userId,
      eventType: 'PLAY_START',
      audioRecordId,
    });

    // Generate signed URL
    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 30 * 60 * 1000,
      });

    return {
      url,
      audioRecord: {
        id: record.id,
        title: record.title,
        type: record.type,
        durationSeconds: record.durationSeconds,
        orderIndex: record.orderIndex,
        chapterId: record.chapterId,
      },
    };
  }

  async updateProgress(userId: string, audioRecordId: string, positionSeconds: number, isCompleted: boolean) {
    // Check for existing progress
    const existing = await this.db.query.userProgress.findFirst({
      where: and(
        eq(schema.userProgress.userId, userId),
        eq(schema.userProgress.audioRecordId, audioRecordId),
      ),
    });

    if (existing) {
      await this.db
        .update(schema.userProgress)
        .set({ positionSeconds, isCompleted, updatedAt: new Date() })
        .where(eq(schema.userProgress.id, existing.id));
    } else {
      await this.db.insert(schema.userProgress).values({
        userId,
        audioRecordId,
        positionSeconds,
        isCompleted,
      });
    }

    if (isCompleted) {
      await this.db.insert(schema.userActivityLogs).values({
        userId,
        eventType: 'PLAY_COMPLETE',
        audioRecordId,
      });
    }

    return { message: 'Progress updated' };
  }

  async getUserProgress(userId: string) {
    const progressRecords = await this.db.query.userProgress.findMany({
      where: eq(schema.userProgress.userId, userId),
    });

    // Enrich with audio record details
    const progress = await Promise.all(
      progressRecords.map(async (p) => {
        const audioRecord = await this.db.query.audioRecords.findFirst({
          where: eq(schema.audioRecords.id, p.audioRecordId),
        });

        const chapter = audioRecord
          ? await this.db.query.chapters.findFirst({
              where: eq(schema.chapters.id, audioRecord.chapterId),
            })
          : null;

        return {
          id: p.id,
          audioRecord,
          chapter,
          positionSeconds: p.positionSeconds,
          isCompleted: p.isCompleted,
          progressPercent: audioRecord
            ? Math.round((p.positionSeconds / (audioRecord.durationSeconds || 1)) * 100)
            : 0,
          updatedAt: p.updatedAt,
        };
      }),
    );

    return {
      total: progress.length,
      completed: progress.filter((p) => p.isCompleted).length,
      items: progress.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    };
  }

  async getLastListenedChapter(userId: string) {
    const lastProgress = await this.db.query.userProgress.findFirst({
      where: eq(schema.userProgress.userId, userId),
      orderBy: [desc(schema.userProgress.updatedAt)],
    });

    if (!lastProgress) {
      return null;
    }

    const audioRecord = await this.db.query.audioRecords.findFirst({
      where: eq(schema.audioRecords.id, lastProgress.audioRecordId),
    });

    if (!audioRecord) {
      return null;
    }

    const chapter = await this.db.query.chapters.findFirst({
      where: eq(schema.chapters.id, audioRecord.chapterId),
    });

    const content = chapter
      ? await this.db.query.content.findFirst({
          where: eq(schema.content.id, chapter.contentId),
        })
      : null;

    return {
      chapter,
      content,
      audioRecord,
      progressPercent: Math.round(
        (lastProgress.positionSeconds / (audioRecord.durationSeconds || 1)) * 100,
      ),
      lastUpdated: lastProgress.updatedAt,
    };
  }

  async getChapterProgress(chapterId: string, userId: string) {
    // Get all audio records in the chapter
    const audioRecords = await this.db.query.audioRecords.findMany({
      where: eq(schema.audioRecords.chapterId, chapterId),
    });

    // Get user progress for these audio records
    const userProgress = await Promise.all(
      audioRecords.map(async (audio) => {
        const progress = await this.db.query.userProgress.findFirst({
          where: and(
            eq(schema.userProgress.userId, userId),
            eq(schema.userProgress.audioRecordId, audio.id),
          ),
        });

        return {
          audioRecord: {
            id: audio.id,
            title: audio.title,
            type: audio.type,
            orderIndex: audio.orderIndex,
            durationSeconds: audio.durationSeconds,
          },
          progress: progress
            ? {
                positionSeconds: progress.positionSeconds,
                isCompleted: progress.isCompleted,
                progressPercent: Math.round(
                  (progress.positionSeconds / (audio.durationSeconds || 1)) * 100,
                ),
              }
            : null,
        };
      }),
    );

    const completed = userProgress.filter((p) => p.progress?.isCompleted).length;
    const total = audioRecords.length;

    return {
      chapterId,
      totalAudioRecords: total,
      completedAudioRecords: completed,
      completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      audioRecords: userProgress,
    };
  }

  async getChapterAudioList(chapterId: string, userId: string) {
    const chapter = await this.db.query.chapters.findFirst({
      where: eq(schema.chapters.id, chapterId),
    });

    if (!chapter) throw new NotFoundException('Chapter not found');

    const content = await this.db.query.content.findFirst({
      where: eq(schema.content.id, chapter.contentId),
    });

    const audioRecords = await this.db.query.audioRecords.findMany({
      where: eq(schema.audioRecords.chapterId, chapterId),
    });

    audioRecords.sort((a, b) => a.orderIndex - b.orderIndex);

    const items = await Promise.all(
      audioRecords.map(async (audio, idx) => {
        const progress = await this.db.query.userProgress.findFirst({
          where: and(
            eq(schema.userProgress.userId, userId),
            eq(schema.userProgress.audioRecordId, audio.id),
          ),
        });

        return {
          id: audio.id,
          title: audio.title,
          type: audio.type,
          durationSeconds: audio.durationSeconds,
          orderIndex: audio.orderIndex,
          bucketKey: audio.bucketKey,
          previousId: idx > 0 ? audioRecords[idx - 1].id : null,
          nextId: idx < audioRecords.length - 1 ? audioRecords[idx + 1].id : null,
          progress: progress
            ? {
                positionSeconds: progress.positionSeconds,
                isCompleted: progress.isCompleted,
                progressPercent: Math.round(
                  (progress.positionSeconds / (audio.durationSeconds || 1)) * 100,
                ),
              }
            : null,
        };
      }),
    );

    return {
      chapter: {
        id: chapter.id,
        title: chapter.title,
        contentId: chapter.contentId,
      },
      content: {
        id: content?.id,
        title: content?.title,
      },
      audioRecords: items,
    };
  }
}
