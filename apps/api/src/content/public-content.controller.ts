import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('content')
export class PublicContentController {
  constructor(private readonly contentService: ContentService) {}

  @Public()
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.contentService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    }, {
      type,
      categoryId,
    });
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }
}
