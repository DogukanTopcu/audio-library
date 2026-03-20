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
import { ContentService } from './content.service.js';
import { CreateContentDto } from './dto/create-content.dto.js';
import { UpdateContentDto } from './dto/update-content.dto.js';
import { AssignCategoriesDto } from './dto/assign-categories.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../common/audit-log.service.js';

@Controller('admin/content')
@UseGuards(AdminAuthGuard)
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.contentService.findAll(pagination, {
      type,
      categoryId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'EDITOR')
  async create(
    @Body() dto: CreateContentDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.contentService.create(dto);
    await this.auditLogService.log({
      adminId,
      action: 'CREATE',
      entityType: 'content',
      entityId: result.id,
      afterState: result,
    });
    return result;
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'EDITOR')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.contentService.findOne(id);
    const result = await this.contentService.update(id, dto);
    await this.auditLogService.log({
      adminId,
      action: 'UPDATE',
      entityType: 'content',
      entityId: id,
      beforeState: before,
      afterState: result,
    });
    return result;
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN')
  async softDelete(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.contentService.findOne(id);
    const result = await this.contentService.softDelete(id);
    await this.auditLogService.log({
      adminId,
      action: 'SOFT_DELETE',
      entityType: 'content',
      entityId: id,
      beforeState: before,
      afterState: result,
    });
    return result;
  }

  @Post(':id/categories')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'EDITOR')
  async assignCategories(
    @Param('id') id: string,
    @Body() dto: AssignCategoriesDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.contentService.assignCategories(id, dto.categoryIds);
    await this.auditLogService.log({
      adminId,
      action: 'ASSIGN_CATEGORIES',
      entityType: 'content',
      entityId: id,
      afterState: result,
    });
    return result;
  }
}
