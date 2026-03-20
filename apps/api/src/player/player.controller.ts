import { Controller, Get, Patch, Query, Body, UseGuards } from '@nestjs/common';
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
}
