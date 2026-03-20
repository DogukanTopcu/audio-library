import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminAuthGuard extends AuthGuard('jwt-admin') {
  handleRequest(err: Error | null, admin: any) {
    if (err || !admin) {
      throw err || new UnauthorizedException('Admin access required');
    }
    return admin;
  }
}
