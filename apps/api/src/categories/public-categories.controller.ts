import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Public()
@Controller('categories')
export class PublicCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }
}
