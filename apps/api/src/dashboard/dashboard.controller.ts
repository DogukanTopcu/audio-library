import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard.js';

@Controller('admin/dashboard')
@UseGuards(AdminAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('recent-registrations')
  getRecentRegistrations() {
    return this.dashboardService.getRecentRegistrations();
  }

  @Get('pending-verifications')
  getPendingVerifications() {
    return this.dashboardService.getPendingVerifications();
  }
}
