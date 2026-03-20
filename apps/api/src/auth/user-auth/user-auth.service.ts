import {
  Injectable,
  Inject,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from '../../drizzle/drizzle.module.js';
import * as schema from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { randomUUID, createHash } from 'crypto';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class UserAuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DB,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.legal_consent) {
      throw new BadRequestException('Legal consent is required');
    }

    const existingEmail = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.email),
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const existingTcId = await this.db.query.users.findFirst({
      where: eq(schema.users.tcId, dto.tc_id),
    });
    if (existingTcId) {
      throw new ConflictException('TC ID already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const [user] = await this.db
      .insert(schema.users)
      .values({
        name: dto.name,
        email: dto.email,
        passwordHash,
        tcId: dto.tc_id,
        phoneNumber: dto.phone_number,
        disabilityDocumentKey: dto.disability_document_key,
        status: 'PENDING_VERIFICATION',
        legalConsentAcceptedAt: new Date(),
      })
      .returning({ id: schema.users.id });

    // Create user agent profile
    await this.db.insert(schema.userAgentProfiles).values({
      userId: user.id,
    });

    return { message: 'Registration successful. Your account is pending admin verification.' };
  }

  async login(dto: LoginDto, deviceInfo: string, ipAddress: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.email),
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'PENDING_VERIFICATION') {
      throw new ForbiddenException('Your account is pending verification.');
    }
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('Your account has been suspended.');
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'user' },
      { expiresIn: '15m' },
    );

    const refreshToken = randomUUID();
    const tokenHash = this.hashToken(refreshToken);

    await this.db.insert(schema.userSessions).values({
      userId: user.id,
      tokenHash,
      deviceInfo,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const session = await this.db.query.userSessions.findFirst({
      where: eq(schema.userSessions.tokenHash, tokenHash),
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, session.userId),
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    // Update last active
    await this.db
      .update(schema.userSessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(schema.userSessions.id, session.id));

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'user' },
      { expiresIn: '15m' },
    );

    return { accessToken };
  }

  async logout(userId: string, allDevices?: boolean) {
    if (allDevices) {
      await this.db
        .delete(schema.userSessions)
        .where(eq(schema.userSessions.userId, userId));
    }
    return { message: 'Logged out successfully' };
  }

  async logoutByToken(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.db
      .delete(schema.userSessions)
      .where(eq(schema.userSessions.tokenHash, tokenHash));
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) throw new UnauthorizedException('User not found');

    const { passwordHash, ...profile } = user;
    return profile;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
