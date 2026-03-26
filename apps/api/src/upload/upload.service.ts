import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GCP_STORAGE } from '../gcp/gcp.module.js';
import { REDIS } from '../redis/redis.module.js';
import { Storage } from '@google-cloud/storage';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { parseBuffer } from 'music-metadata';

@Injectable()
export class UploadService {
  private bucketName: string;
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @Inject(GCP_STORAGE) private readonly storage: Storage,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {
    this.bucketName = this.config.get<string>('GCP_BUCKET_NAME', 'ozan-bayir-assets');
  }

  async uploadDocument(file: Express.Multer.File): Promise<{ key: string; url: string }> {
    this.validateFile(file, ['application/pdf', 'image/jpeg', 'image/png'], 10 * 1024 * 1024);

    const ext = extname(file.originalname);
    const key = `documents/users/pending/${Date.now()}-${randomUUID()}${ext}`;

    await this.uploadToGcs(key, file.buffer, file.mimetype);
    const url = await this.generateSignedUrl(key, 60);

    return { key, url };
  }

  async uploadAudio(
    file: Express.Multer.File,
    contentId: string,
    chapterId: string,
  ): Promise<{ key: string; url: string; durationSeconds: number }> {
    this.validateFile(file, ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'], 200 * 1024 * 1024);

    const key = `audio/${contentId}/${chapterId}/${randomUUID()}.mp3`;
    await this.uploadToGcs(key, file.buffer, file.mimetype);
    const url = await this.generateSignedUrl(key, 60);

    // Extract audio duration from buffer
    let durationSeconds = 0;
    try {
      const metadata = await parseBuffer(file.buffer, { mimeType: file.mimetype as any });
      durationSeconds = Math.round(metadata.format.duration ?? 0);
    } catch (err) {
      this.logger.warn(`Could not extract audio duration: ${err}`);
    }

    return { key, url, durationSeconds };
  }

  async uploadImage(file: Express.Multer.File): Promise<{ key: string; url: string }> {
    this.validateFile(file, ['image/jpeg', 'image/png', 'image/webp'], 5 * 1024 * 1024);

    const ext = extname(file.originalname);
    const key = `images/content/${randomUUID()}${ext}`;

    await this.uploadToGcs(key, file.buffer, file.mimetype);
    const url = await this.generateSignedUrl(key, 60);

    return { key, url };
  }

  async getSignedUrl(key: string, userId: string): Promise<{ url: string }> {
    // Rate limiting: 60 requests per user per minute
    const rateLimitKey = `signed-url:rate:${userId}`;
    const count = await this.redis.incr(rateLimitKey);
    if (count === 1) {
      await this.redis.expire(rateLimitKey, 60);
    }
    if (count > 60) {
      throw new BadRequestException('Rate limit exceeded. Try again later.');
    }

    const url = await this.generateSignedUrl(key, 30);
    return { url };
  }

  private validateFile(file: Express.Multer.File, allowedTypes: string[], maxSize: number) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }
    if (file.size > maxSize) {
      throw new BadRequestException(`File too large. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB`);
    }
  }

  private async uploadToGcs(key: string, buffer: Buffer, contentType: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const blob = bucket.file(key);
    await blob.save(buffer, { contentType, resumable: false });
  }

  private async generateSignedUrl(key: string, expiresInMinutes: number): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const [url] = await bucket.file(key).getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });
    return url;
  }
}
