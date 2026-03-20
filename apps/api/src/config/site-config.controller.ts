import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SiteConfigService } from './site-config.service.js';
import { UpsertConfigDto } from './dto/upsert-config.dto.js';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AuditLogService } from '../common/audit-log.service.js';

@Controller('admin/config')
@UseGuards(AdminAuthGuard)
export class SiteConfigController {
  constructor(
    private readonly siteConfigService: SiteConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  findAll() {
    return this.siteConfigService.findAll();
  }

  @Get(':section')
  findBySection(@Param('section') section: string) {
    return this.siteConfigService.findBySection(section);
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN')
  async upsert(
    @Body() dto: UpsertConfigDto,
    @CurrentUser('id') adminId: string,
  ) {
    const before = await this.siteConfigService.findBySection(dto.section);
    const result = await this.siteConfigService.upsert(dto.section, dto.updates, adminId);
    await this.auditLogService.log({
      adminId,
      action: 'UPSERT_CONFIG',
      entityType: 'site_configuration',
      beforeState: before,
      afterState: dto.updates,
    });
    return result;
  }
}
