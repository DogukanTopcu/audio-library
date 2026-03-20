import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto.email, dto.password);
  }

  @Post('logout')
  logout() {
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AdminAuthGuard)
  @Get('me')
  getProfile(@CurrentUser('id') adminId: string) {
    return this.adminAuthService.getProfile(adminId);
  }
}
