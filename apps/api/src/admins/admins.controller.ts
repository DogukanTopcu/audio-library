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
import { AdminsService } from './admins.service.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../common/audit-log.service.js';

@Controller('admin/admins')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
export class AdminsController {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  findAll() {
    return this.adminsService.findAll();
  }

  @Post()
  async create(
    @Body() dto: CreateAdminDto,
    @CurrentUser('id') adminId: string,
  ) {
    const result = await this.adminsService.create(dto, adminId);
    await this.auditLogService.log({
      adminId,
      action: 'CREATE',
      entityType: 'admin',
      entityId: result.id,
      afterState: { email: result.email, name: result.name, role: result.role },
    });
    return result;
  }

  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.adminsService.findOne(id);
    const result = await this.adminsService.updateRole(id, dto.role);
    await this.auditLogService.log({
      adminId,
      action: 'UPDATE_ROLE',
      entityType: 'admin',
      entityId: id,
      beforeState: { role: before.role },
      afterState: { role: result.role },
    });
    return result;
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.adminsService.findOne(id);
    const result = await this.adminsService.remove(id, adminId);
    await this.auditLogService.log({
      adminId,
      action: 'DELETE',
      entityType: 'admin',
      entityId: id,
      beforeState: { email: before.email, name: before.name },
    });
    return result;
  }
}
