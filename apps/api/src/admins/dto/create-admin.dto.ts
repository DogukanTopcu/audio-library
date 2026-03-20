import { IsString, IsEmail, IsOptional, IsIn, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsIn(['SUPERADMIN', 'EDITOR'])
  role?: 'SUPERADMIN' | 'EDITOR';
}
