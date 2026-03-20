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
import { QuestionsService } from './questions.service.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../common/audit-log.service.js';

@Controller('admin/questions')
@UseGuards(AdminAuthGuard)
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  findByChapter(@Query('chapterId') chapterId: string) {
    return this.questionsService.findByChapter(chapterId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: CreateQuestionDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.questionsService.create(dto);
    await this.auditLogService.log({
      adminId,
      action: 'CREATE',
      entityType: 'question',
      entityId: result.id,
      afterState: result,
    });
    return result;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.questionsService.findOne(id);
    const result = await this.questionsService.update(id, dto);
    await this.auditLogService.log({
      adminId,
      action: 'UPDATE',
      entityType: 'question',
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
    const before = await this.questionsService.findOne(id);
    const result = await this.questionsService.remove(id);
    await this.auditLogService.log({
      adminId,
      action: 'DELETE',
      entityType: 'question',
      entityId: id,
      beforeState: before,
    });
    return result;
  }
}
