import { Module } from '@nestjs/common';
import { AudioRecordsController } from './audio-records.controller.js';
import { AudioRecordsService } from './audio-records.service.js';

@Module({
  controllers: [AudioRecordsController],
  providers: [AudioRecordsService],
  exports: [AudioRecordsService],
})
export class AudioRecordsModule {}
