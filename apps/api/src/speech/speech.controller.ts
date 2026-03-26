import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SpeechService } from './speech.service.js';

@UseGuards(JwtAuthGuard)
@Controller('speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {}

  /**
   * POST /api/speech/recognize
   *
   * Accepts an audio file (webm/ogg/wav) and returns the Turkish transcript
   * using Google Cloud Speech-to-Text API.
   */
  @Post('recognize')
  @UseInterceptors(FileInterceptor('audio'))
  async recognize(@UploadedFile() file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No audio file provided');
    }

    const result = await this.speechService.recognize(
      file.buffer,
      file.mimetype,
    );

    return result;
  }
}

