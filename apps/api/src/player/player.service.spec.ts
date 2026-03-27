import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';

jest.mock('../drizzle/drizzle.module.js', () => ({
  DRIZZLE: Symbol('DRIZZLE'),
}), { virtual: true });

jest.mock('../gcp/gcp.module.js', () => ({
  GCP_STORAGE: Symbol('GCP_STORAGE'),
}), { virtual: true });

jest.mock('../../../../packages/db/src/schema/index.js', () => ({
  audioRecords: { id: 'audio-record-id' },
  userActivityLogs: {},
}), { virtual: true });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PlayerService } = require('./player.service') as {
  PlayerService: typeof import('./player.service').PlayerService;
};

describe('PlayerService', () => {
  function createService(options?: {
    record?: {
      id: string;
      title: string;
      type: string;
      durationSeconds: number | null;
      orderIndex: number;
      chapterId: string;
      bucketKey: string;
    } | null;
    exists?: boolean;
    signedUrl?: string;
  }) {
    const findFirst = jest.fn().mockResolvedValue(options?.record ?? null);
    const values = jest.fn().mockResolvedValue(undefined);
    const insert = jest.fn().mockReturnValue({ values });
    const exists = jest.fn().mockResolvedValue([options?.exists ?? true]);
    const getSignedUrl = jest
      .fn()
      .mockResolvedValue([options?.signedUrl ?? 'https://example.test/audio.mp3']);
    const file = jest.fn().mockReturnValue({ exists, getSignedUrl });
    const bucket = jest.fn().mockReturnValue({ file });

    const db = {
      query: {
        audioRecords: {
          findFirst,
        },
      },
      insert,
    } as unknown as ConstructorParameters<typeof PlayerService>[0];

    const storage = {
      bucket,
    } as unknown as Storage;

    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'GCP_BUCKET_NAME') {
          return 'alo-audio';
        }
        return fallback;
      }),
    } as unknown as ConfigService;

    return {
      service: new PlayerService(db, storage, config),
      mocks: { findFirst, insert, values, bucket, file, exists, getSignedUrl },
    };
  }

  it('throws when the audio record does not exist', async () => {
    const { service } = createService({ record: null });

    await expect(service.getPlayerToken('missing-record', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when the storage object is missing', async () => {
    const { service, mocks } = createService({
      record: {
        id: 'audio-1',
        title: 'Audio 1',
        type: 'OTHER',
        durationSeconds: 42,
        orderIndex: 0,
        chapterId: 'chapter-1',
        bucketKey: 'audio/math9/chapter1/natural-numbers-intro.mp3',
      },
      exists: false,
    });

    await expect(service.getPlayerToken('audio-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mocks.getSignedUrl).not.toHaveBeenCalled();
  });

  it('returns a signed URL when the storage object exists', async () => {
    const { service, mocks } = createService({
      record: {
        id: 'audio-1',
        title: 'Audio 1',
        type: 'OTHER',
        durationSeconds: 42,
        orderIndex: 0,
        chapterId: 'chapter-1',
        bucketKey: 'audio/math9/chapter1/natural-numbers-intro.mp3',
      },
      exists: true,
      signedUrl: 'https://example.test/signed.mp3',
    });

    await expect(service.getPlayerToken('audio-1', 'user-1')).resolves.toEqual({
      url: 'https://example.test/signed.mp3',
      audioRecord: {
        id: 'audio-1',
        title: 'Audio 1',
        type: 'OTHER',
        durationSeconds: 42,
        orderIndex: 0,
        chapterId: 'chapter-1',
      },
    });

    expect(mocks.insert).toHaveBeenCalled();
    expect(mocks.getSignedUrl).toHaveBeenCalled();
  });
});




