import { Module } from '@nestjs/common';
import { ContentController } from './content.controller.js';
import { PublicContentController } from './public-content.controller.js';
import { KesfetController } from './kesfet.controller.js';
import { KesfetDetailsController } from './kesfet-details.controller.js';
import { ContentService } from './content.service.js';

@Module({
  controllers: [ContentController, PublicContentController, KesfetController, KesfetDetailsController],
  providers: [ContentService],
})
export class ContentModule {}
