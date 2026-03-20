import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChaptersService } from './chapters.service.js';
import { CreateChapterDto } from './dto/create-chapter.dto.js';
import { UpdateChapterDto } from './dto/update-chapter.dto.js';
import { ReorderChapterDto } from './dto/reorder-chapter.dto.js';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../common/audit-log.service.js';

@Controller('admin/chapters')
@UseGuards(AdminAuthGuard)
export class ChaptersController {
  constructor(
    private readonly chaptersService: ChaptersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  findByContent(@Query('contentId') contentId: string) {
    return this.chaptersService.findByContent(contentId);
  }

  @Post()
  async create(
    @Body() dto: CreateChapterDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.chaptersService.create(dto);
    await this.auditLogService.log({
      adminId,
      action: 'CREATE',
      entityType: 'chapter',
      entityId: result.id,
      afterState: result,
    });
    return result;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChapterDto,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.chaptersService.findOne(id);
    const result = await this.chaptersService.update(id, dto);
    await this.auditLogService.log({
      adminId,
      action: 'UPDATE',
      entityType: 'chapter',
      entityId: id,
      beforeState: before,
      afterState: result,
    });
    return result;
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.chaptersService.findOne(id);
    const result = await this.chaptersService.remove(id);
    await this.auditLogService.log({
      adminId,
      action: 'DELETE',
      entityType: 'chapter',
      entityId: id,
      beforeState: before,
    });
    return result;
  }

  @Patch(':id/reorder')
  async reorder(
    @Param('id') id: string,
    @Body() dto: ReorderChapterDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.chaptersService.reorder(id, dto.orderIndex);
    await this.auditLogService.log({
      adminId,
      action: 'REORDER',
      entityType: 'chapter',
      entityId: id,
      afterState: result,
    });
    return result;
  }
}
