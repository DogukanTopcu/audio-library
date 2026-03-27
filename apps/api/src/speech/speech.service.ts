import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechClient, protos } from '@google-cloud/speech';

type RecognitionConfig = protos.google.cloud.speech.v1.IRecognitionConfig;
type SpeechRecognitionResult = { transcript: string; alternatives: string[] };
type SpeechApiError = Error & { code?: number; details?: string };

@Injectable()
export class SpeechService {
  private client: SpeechClient;
  private readonly logger = new Logger(SpeechService.name);
  private readonly hasExplicitCredentials: boolean;
  private readonly hasProjectId: boolean;

  constructor(private readonly config: ConfigService) {
    const credentialsJson = config.get<string>('GCP_CREDENTIALS_JSON');
    let credentials: Record<string, unknown> | undefined;
    const projectId = config.get<string>('GCP_PROJECT_ID')?.trim();

    if (credentialsJson) {
      try {
        credentials = JSON.parse(credentialsJson) as Record<string, unknown>;
      } catch {
        this.logger.warn('Invalid GCP_CREDENTIALS_JSON – Speech service will not work.');
      }
    }

    this.hasExplicitCredentials = Boolean(credentials);
    this.hasProjectId = Boolean(projectId);

    this.client = new SpeechClient({
      ...(projectId ? { projectId } : {}),
      ...(credentials ? { credentials } : {}),
    });

    if (!this.hasExplicitCredentials && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.logger.warn(
        'Google Cloud Speech credentials are not configured. Voice recognition requests will fail until credentials are provided.',
      );
    }

    this.logger.log('Google Cloud Speech-to-Text client initialized');
  }

  /**
   * Recognize speech from an audio buffer.
   * Always uses Turkish (tr-TR) and the "command_and_search" model
   * which is optimized for short voice commands.
   */
  async recognize(
    audioBuffer: Buffer,
    mimeType = 'audio/webm;codecs=opus',
  ): Promise<SpeechRecognitionResult> {
    if (!audioBuffer?.length) {
      throw new BadRequestException('Audio file is empty');
    }

    this.ensureServiceConfigured();

    const normalizedMimeType = mimeType.toLowerCase();
    const recognitionConfigs = this.buildRecognitionConfigs(normalizedMimeType);
    const audioContent = audioBuffer.toString('base64');
    let lastError: SpeechApiError | undefined;

    for (const recognitionConfig of recognitionConfigs) {
      try {
        const [response] = await this.client.recognize({
          audio: { content: audioContent },
          config: recognitionConfig,
        });

        const result = this.mapRecognitionResponse(response.results ?? []);
        this.logger.debug(
          `Transcript: "${result.transcript}" (${result.alternatives.length} alternatives)`,
        );
        return result;
      } catch (error) {
        lastError = error as SpeechApiError;

        if (!this.shouldRetryWithFallback(lastError)) {
          break;
        }

        this.logger.warn(
          `Speech recognition attempt failed for mimeType=${normalizedMimeType}; retrying with fallback config. ${lastError.message}`,
        );
      }
    }

    this.logger.error(
      'Speech recognition failed',
      lastError instanceof Error ? lastError.stack : String(lastError),
    );
    throw this.mapRecognitionError(lastError);
  }

  private mapEncoding(mimeType: string): RecognitionConfig['encoding'] {
    if (mimeType.includes('webm')) return 'WEBM_OPUS';
    if (mimeType.includes('ogg')) return 'OGG_OPUS';
    if (mimeType.includes('flac')) return 'FLAC';
    if (mimeType.includes('wav') || mimeType.includes('pcm')) return 'LINEAR16';
    // Default to WEBM_OPUS (Chrome default)
    return 'WEBM_OPUS';
  }

  private mapSampleRate(mimeType: string): number | undefined {
    if (mimeType.includes('webm') || mimeType.includes('ogg')) return 48000;
    if (mimeType.includes('wav') || mimeType.includes('pcm')) return 16000;
    if (mimeType.includes('flac')) return undefined;
    return 48000;
  }

  private buildRecognitionConfigs(mimeType: string): RecognitionConfig[] {
    const encoding = this.mapEncoding(mimeType);
    const sampleRateHertz = this.mapSampleRate(mimeType);
    const speechContexts: NonNullable<RecognitionConfig['speechContexts']> = [
      {
        phrases: [
          'sonraki',
          'önceki',
          'durdur',
          'devam',
          'başlat',
          'ileri sar',
          'geri sar',
          'tekrar',
          'kapat',
          'oynat',
          'dur',
          'ses aç',
          'ses kıs',
        ],
        boost: 15,
      },
    ];

    const baseConfig: RecognitionConfig = {
      encoding,
      languageCode: 'tr-TR',
      maxAlternatives: 3,
      speechContexts,
      ...(sampleRateHertz ? { sampleRateHertz } : {}),
    };

    const configs: RecognitionConfig[] = [
      {
        ...baseConfig,
        model: 'latest_short',
      },
      baseConfig,
    ];

    if (mimeType.includes('webm') || mimeType.includes('ogg')) {
      configs.push({
        ...baseConfig,
        sampleRateHertz: undefined,
      });
    }

    return configs;
  }

  private mapRecognitionResponse(
    results: NonNullable<
      protos.google.cloud.speech.v1.IRecognizeResponse['results']
    >,
  ): SpeechRecognitionResult {
    const allAlternatives: string[] = [];
    let bestTranscript = '';

    for (const result of results) {
      if (result.alternatives && result.alternatives.length > 0) {
        if (!bestTranscript) {
          const [firstAlternative] = result.alternatives;
          bestTranscript = firstAlternative?.transcript?.trim() ?? '';
        }
        for (const alt of result.alternatives) {
          if (alt.transcript?.trim()) {
            allAlternatives.push(alt.transcript.trim().toLowerCase());
          }
        }
      }
    }

    return {
      transcript: bestTranscript.toLowerCase(),
      alternatives: Array.from(new Set(allAlternatives)),
    };
  }

  private ensureServiceConfigured() {
    if (
      this.hasExplicitCredentials ||
      this.hasProjectId ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    ) {
      return;
    }

    throw new ServiceUnavailableException(
      'Voice recognition is not configured on the server. Set Google Cloud Speech credentials first.',
    );
  }

  private shouldRetryWithFallback(error: SpeechApiError | undefined): boolean {
    if (!error) return false;

    const details = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
    return (
      error.code === 3 ||
      details.includes('sample rate') ||
      details.includes('model') ||
      details.includes('invalid recognition config') ||
      details.includes('bad encoding') ||
      details.includes('must either specify')
    );
  }

  private mapRecognitionError(error: SpeechApiError | undefined): Error {
    if (!error) {
      return new ServiceUnavailableException('Voice recognition is temporarily unavailable.');
    }

    const details = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();

    if (
      error.code === 3 ||
      details.includes('invalid recognition config') ||
      details.includes('sample rate') ||
      details.includes('bad encoding') ||
      details.includes('unsupported')
    ) {
      return new BadRequestException(
        'Audio format could not be processed for speech recognition.',
      );
    }

    if (
      error.code === 7 ||
      error.code === 16 ||
      details.includes('permission') ||
      details.includes('credential') ||
      details.includes('unauthenticated')
    ) {
      return new ServiceUnavailableException(
        'Voice recognition service credentials are invalid or missing.',
      );
    }

    return new ServiceUnavailableException(
      'Voice recognition is temporarily unavailable. Please try again shortly.',
    );
  }
}

