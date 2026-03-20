import { Module } from '@nestjs/common';
import { SiteConfigController } from './site-config.controller.js';
import { SiteConfigService } from './site-config.service.js';

@Module({
  controllers: [SiteConfigController],
  providers: [SiteConfigService],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}
