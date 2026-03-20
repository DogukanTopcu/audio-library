import {
  Injectable,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from '../../drizzle/drizzle.module.js';
import * as schema from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class AdminAuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DB,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.db.query.admins.findFirst({
      where: eq(schema.admins.email, email),
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.jwtService.sign(
      { sub: admin.id, email: admin.email, role: admin.role, type: 'admin' },
      { expiresIn: '60m' },
    );

    return {
      accessToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  async getProfile(adminId: string) {
    const admin = await this.db.query.admins.findFirst({
      where: eq(schema.admins.id, adminId),
    });

    if (!admin) throw new UnauthorizedException('Admin not found');

    const { passwordHash, ...profile } = admin;
    return profile;
  }
}
