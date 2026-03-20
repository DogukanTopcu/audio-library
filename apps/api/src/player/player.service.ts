import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import { GCP_STORAGE } from '../gcp/gcp.module.js';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import * as schema from '@repo/db/schema';
import { eq, and } from 'drizzle-orm';
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

    // Log activity
    await this.db.insert(schema.userActivityLogs).values({
      userId,
      eventType: 'PLAY_START',
      audioRecordId,
    });

    // Generate signed URL
    const [url] = await this.storage
      .bucket(this.bucketName)
      .file(record.bucketKey)
      .getSignedUrl({
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
}
