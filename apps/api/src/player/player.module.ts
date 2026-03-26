import { Module } from '@nestjs/common';
import { PlayerController } from './player.controller.js';
import { ProgressController } from './progress.controller.js';
import { PlayerService } from './player.service.js';

@Module({
  controllers: [PlayerController, ProgressController],
  providers: [PlayerService],
})
export class PlayerModule {}
