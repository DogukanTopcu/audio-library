import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Public()
@Controller('content')
export class PublicContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.contentService.findAll(
      {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      { type, categoryId, isActive: true, search },
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  @Get(':id/chapters')
  async getChapters(@Param('id') contentId: string) {
    // Import ChaptersService would add coupling; reuse ContentService findOne
    const content = await this.contentService.findOne(contentId);
    return content;
  }
}
