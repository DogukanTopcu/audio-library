import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { PlayerService } from './player.service.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get('token')
  getToken(
    @Query('audioRecordId') audioRecordId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.playerService.getPlayerToken(audioRecordId, userId);
  }

  @Patch('progress')
  updateProgress(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.playerService.updateProgress(
      userId,
      dto.audioRecordId,
      dto.positionSeconds,
      dto.isCompleted,
    );
  }

  @Get('progress')
  async getProgress(@CurrentUser('id') userId: string) {
    return this.playerService.getUserProgress(userId);
  }

  @Get('progress/last-chapter')
  async getLastListenedChapter(@CurrentUser('id') userId: string) {
    return this.playerService.getLastListenedChapter(userId);
  }

  @Get('progress/chapter/:chapterId')
  async getChapterProgress(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.playerService.getChapterProgress(chapterId, userId);
  }

  @Get('chapter/:chapterId/audio-list')
  async getChapterAudioList(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.playerService.getChapterAudioList(chapterId, userId);
  }
}
