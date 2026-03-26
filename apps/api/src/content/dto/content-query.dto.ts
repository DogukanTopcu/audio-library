import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class ContentQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

