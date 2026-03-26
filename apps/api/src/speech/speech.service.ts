import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpeechClient, protos } from '@google-cloud/speech';

type RecognitionConfig = protos.google.cloud.speech.v1.IRecognitionConfig;

@Injectable()
export class SpeechService {
  private client: SpeechClient;
  private readonly logger = new Logger(SpeechService.name);

  constructor(private readonly config: ConfigService) {
    const credentialsJson = config.get<string>('GCP_CREDENTIALS_JSON');
    let credentials: Record<string, unknown> | undefined;

    if (credentialsJson) {
      try {
        credentials = JSON.parse(credentialsJson) as Record<string, unknown>;
      } catch {
        this.logger.warn('Invalid GCP_CREDENTIALS_JSON – Speech service will not work.');
      }
    }

    this.client = new SpeechClient({
      projectId: config.get('GCP_PROJECT_ID'),
      ...(credentials ? { credentials } : {}),
    });

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
  ): Promise<{ transcript: string; alternatives: string[] }> {
    const encoding = this.mapEncoding(mimeType);
    const sampleRateHertz = this.mapSampleRate(mimeType);

    const config: RecognitionConfig = {
      encoding,
      sampleRateHertz,
      languageCode: 'tr-TR',
      model: 'command_and_search',
      maxAlternatives: 3,
      speechContexts: [
        {
          phrases: [
            // boost common voice commands for better recognition
            'sonraki', 'önceki', 'durdur', 'devam', 'başlat',
            'ileri sar', 'geri sar', 'tekrar', 'kapat',
            'oynat', 'dur', 'ses aç', 'ses kıs',
          ],
          boost: 15,
        },
      ],
    };

    try {
      const [response] = await this.client.recognize({
        audio: { content: audioBuffer.toString('base64') },
        config,
      });

      const results = response.results ?? [];
      const allAlternatives: string[] = [];
      let bestTranscript = '';

      for (const result of results) {
        if (result.alternatives && result.alternatives.length > 0) {
          if (!bestTranscript) {
            bestTranscript = result.alternatives[0].transcript?.trim() ?? '';
          }
          for (const alt of result.alternatives) {
            if (alt.transcript?.trim()) {
              allAlternatives.push(alt.transcript.trim());
            }
          }
        }
      }

      this.logger.debug(`Transcript: "${bestTranscript}" (${allAlternatives.length} alternatives)`);

      return {
        transcript: bestTranscript.toLowerCase(),
        alternatives: allAlternatives.map((a) => a.toLowerCase()),
      };
    } catch (error) {
      this.logger.error('Speech recognition failed:', error);
      throw error;
    }
  }

  private mapEncoding(mimeType: string): RecognitionConfig['encoding'] {
    if (mimeType.includes('webm')) return 'WEBM_OPUS';
    if (mimeType.includes('ogg')) return 'OGG_OPUS';
    if (mimeType.includes('flac')) return 'FLAC';
    if (mimeType.includes('wav') || mimeType.includes('pcm')) return 'LINEAR16';
    // Default to WEBM_OPUS (Chrome default)
    return 'WEBM_OPUS';
  }

  private mapSampleRate(mimeType: string): number {
    if (mimeType.includes('webm') || mimeType.includes('ogg')) return 48000;
    return 16000;
  }
}

