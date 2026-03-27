import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechService } from './speech.service';

type MockRecognizeRequest = {
  config?: {
    model?: string;
  };
};

type MockRecognizeResponse = [
  {
    results?: Array<{
      alternatives?: Array<{
        transcript?: string;
      }>;
    }>;
  },
];

const mockRecognize = jest.fn<Promise<MockRecognizeResponse>, [MockRecognizeRequest]>();

jest.mock('@google-cloud/speech', () => ({
  SpeechClient: jest.fn().mockImplementation(() => ({
    recognize: mockRecognize,
  })),
  protos: {
    google: {
      cloud: {
        speech: {
          v1: {},
        },
      },
    },
  },
}));

describe('SpeechService', () => {
  const originalGoogleApplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  beforeEach(() => {
    mockRecognize.mockReset();
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  });

  afterAll(() => {
    if (originalGoogleApplicationCredentials) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = originalGoogleApplicationCredentials;
    } else {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
  });

  function createService(configValues?: Record<string, string | undefined>) {
    const config = {
      get: jest.fn((key: string) => configValues?.[key]),
    } as unknown as ConfigService;

    return new SpeechService(config);
  }

  it('retries with a fallback config when the preferred model is rejected', async () => {
    mockRecognize
      .mockRejectedValueOnce({
        code: 3,
        message: 'Invalid recognition config: model latest_short is not supported',
      })
      .mockResolvedValueOnce([
        {
          results: [
            {
              alternatives: [{ transcript: 'Sonraki' }],
            },
          ],
        },
      ]);

    const service = createService({
      GCP_PROJECT_ID: 'test-project',
      GCP_CREDENTIALS_JSON: JSON.stringify({ client_email: 'test@example.com' }),
    });

    await expect(
      service.recognize(Buffer.from('audio'), 'audio/webm;codecs=opus'),
    ).resolves.toEqual({
      transcript: 'sonraki',
      alternatives: ['sonraki'],
    });

    expect(mockRecognize).toHaveBeenCalledTimes(2);
    const firstCall = mockRecognize.mock.calls[0]?.[0];
    const secondCall = mockRecognize.mock.calls[1]?.[0];

    expect(firstCall?.config?.model).toBe('latest_short');
    expect(secondCall?.config?.model).toBeUndefined();
  });

  it('throws a 503-style exception when credentials are missing', async () => {
    const service = createService({
      GCP_PROJECT_ID: undefined,
      GCP_CREDENTIALS_JSON: undefined,
    });

    await expect(
      service.recognize(Buffer.from('audio'), 'audio/webm;codecs=opus'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(mockRecognize).not.toHaveBeenCalled();
  });

  it('maps invalid audio format errors to bad request', async () => {
    mockRecognize.mockRejectedValue({
      code: 3,
      message: 'Bad encoding: unsupported container',
    });

    const service = createService({
      GCP_PROJECT_ID: 'test-project',
      GCP_CREDENTIALS_JSON: JSON.stringify({ client_email: 'test@example.com' }),
    });

    await expect(
      service.recognize(Buffer.from('audio'), 'audio/webm;codecs=opus'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty audio payloads', async () => {
    const service = createService({
      GCP_PROJECT_ID: 'test-project',
      GCP_CREDENTIALS_JSON: JSON.stringify({ client_email: 'test@example.com' }),
    });

    await expect(service.recognize(Buffer.alloc(0))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

