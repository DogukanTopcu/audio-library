import { IsIn } from 'class-validator';

export class UpdateRoleDto {
  @IsIn(['SUPERADMIN', 'EDITOR'])
  role: 'SUPERADMIN' | 'EDITOR';
}
