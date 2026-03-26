import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller.js';
import { PublicQuestionsController } from './public-questions.controller.js';
import { QuestionsService } from './questions.service.js';

@Module({
  controllers: [QuestionsController, PublicQuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
