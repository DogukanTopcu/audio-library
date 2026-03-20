import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import * as schema from '../../../../packages/db/src/schema/index.js';
import { admins } from '../../../../packages/db/src/schema/index.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import * as bcrypt from 'bcryptjs';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class AdminsService {
  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  async findAll() {
    const allAdmins = await this.db.query.admins.findMany({
      columns: {
        passwordHash: false,
      },
    });

    return allAdmins;
  }

  async findOne(id: string) {
    const admin = await this.db.query.admins.findFirst({
      where: eq(admins.id, id),
      columns: {
        passwordHash: false,
      },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with id ${id} not found`);
    }

    return admin;
  }

  async create(dto: CreateAdminDto, createdById: string) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const [created] = await this.db.insert(admins).values({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role ?? 'EDITOR',
      createdBy: createdById,
    }).returning();

    const { passwordHash: _, ...result } = created;
    return result;
  }

  async updateRole(id: string, role: 'SUPERADMIN' | 'EDITOR') {
    await this.findOne(id);

    const [updated] = await this.db
      .update(admins)
      .set({ role })
      .where(eq(admins.id, id))
      .returning();

    const { passwordHash: _, ...result } = updated;
    return result;
  }

  async remove(id: string, currentAdminId: string) {
    if (id === currentAdminId) {
      throw new BadRequestException('You cannot delete your own admin account');
    }

    await this.findOne(id);

    await this.db.delete(admins).where(eq(admins.id, id));

    return { deleted: true };
  }
}
