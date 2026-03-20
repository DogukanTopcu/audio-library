import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../common/audit-log.service.js';

@Controller('admin/categories')
@UseGuards(AdminAuthGuard)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'EDITOR')
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.categoriesService.create(dto);
    await this.auditLogService.log({
      adminId,
      action: 'CREATE',
      entityType: 'category',
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
    @Body() dto: UpdateCategoryDto,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.categoriesService.findOne(id);
    const result = await this.categoriesService.update(id, dto);
    await this.auditLogService.log({
      adminId,
      action: 'UPDATE',
      entityType: 'category',
      entityId: id,
      beforeState: before,
      afterState: result,
    });
    return result;
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN')
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.categoriesService.findOne(id);
    const result = await this.categoriesService.remove(id);
    await this.auditLogService.log({
      adminId,
      action: 'DELETE',
      entityType: 'category',
      entityId: id,
      beforeState: before,
    });
    return result;
  }
}
