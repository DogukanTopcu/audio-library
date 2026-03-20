import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAdminStrategy } from './strategies/jwt-admin.strategy.js';
import { UserAuthService } from './user-auth/user-auth.service.js';
import { UserAuthController } from './user-auth/user-auth.controller.js';
import { AdminAuthService } from './admin-auth/admin-auth.service.js';
import { AdminAuthController } from './admin-auth/admin-auth.controller.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [UserAuthController, AdminAuthController],
  providers: [
    JwtStrategy,
    JwtAdminStrategy,
    UserAuthService,
    AdminAuthService,
  ],
  exports: [UserAuthService, AdminAuthService, JwtModule],
})
export class AuthModule {}
