import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../common/audit-log.service.js';

@Controller('admin/users')
@UseGuards(AdminAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(pagination, { status, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/verify')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN', 'EDITOR')
  async verify(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.usersService.findOne(id);
    const result = await this.usersService.verify(id);
    await this.auditLogService.log({
      adminId,
      action: 'VERIFY_USER',
      entityType: 'user',
      entityId: id,
      beforeState: { status: before.status },
      afterState: { status: result.status },
    });
    return result;
  }

  @Patch(':id/suspend')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN')
  async suspend(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.usersService.findOne(id);
    const result = await this.usersService.suspend(id);
    await this.auditLogService.log({
      adminId,
      action: 'SUSPEND_USER',
      entityType: 'user',
      entityId: id,
      beforeState: { status: before.status },
      afterState: { status: result.status },
    });
    return result;
  }
}
