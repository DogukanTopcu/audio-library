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
import { AudioRecordsService } from './audio-records.service.js';
import { CreateAudioRecordDto } from './dto/create-audio-record.dto.js';
import { UpdateAudioRecordDto } from './dto/update-audio-record.dto.js';
import { ReorderAudioRecordDto } from './dto/reorder-audio-record.dto.js';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../common/audit-log.service.js';

@Controller('admin/audio-records')
@UseGuards(AdminAuthGuard)
export class AudioRecordsController {
  constructor(
    private readonly audioRecordsService: AudioRecordsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  findByChapter(@Query('chapterId') chapterId: string) {
    return this.audioRecordsService.findByChapter(chapterId);
  }

  @Post()
  async create(
    @Body() dto: CreateAudioRecordDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.audioRecordsService.create(dto);
    await this.auditLogService.log({
      adminId,
      action: 'CREATE',
      entityType: 'audio_record',
      entityId: result.id,
      afterState: result,
    });
    return result;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAudioRecordDto,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.audioRecordsService.findOne(id);
    const result = await this.audioRecordsService.update(id, dto);
    await this.auditLogService.log({
      adminId,
      action: 'UPDATE',
      entityType: 'audio_record',
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
    const before = await this.audioRecordsService.findOne(id);
    const result = await this.audioRecordsService.remove(id);
    await this.auditLogService.log({
      adminId,
      action: 'DELETE',
      entityType: 'audio_record',
      entityId: id,
      beforeState: before,
    });
    return result;
  }

  @Patch(':id/reorder')
  async reorder(
    @Param('id') id: string,
    @Body() dto: ReorderAudioRecordDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.audioRecordsService.reorder(id, dto.orderIndex);
    await this.auditLogService.log({
      adminId,
      action: 'REORDER',
      entityType: 'audio_record',
      entityId: id,
      afterState: result,
    });
    return result;
  }
}
