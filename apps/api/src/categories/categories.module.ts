import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { PublicCategoriesController } from './public-categories.controller.js';
import { CategoriesService } from './categories.service.js';

@Module({
  controllers: [CategoriesController, PublicCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
