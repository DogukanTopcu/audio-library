import { Module } from '@nestjs/common';
import { ContentController } from './content.controller.js';
import { PublicContentController } from './public-content.controller.js';
import { ContentService } from './content.service.js';

@Module({
  controllers: [ContentController, PublicContentController, KesfetController, KesfetDetailsController],
  providers: [ContentService],
  controllers: [ContentController, PublicContentController],
})
export class ContentModule {}
