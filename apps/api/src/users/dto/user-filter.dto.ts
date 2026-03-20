import { IsOptional, IsString, IsIn } from 'class-validator';

export class UserFilterDto {
  @IsOptional()
  @IsIn(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED'])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
