import { IsString, IsOptional, IsUUID, IsInt, Min } from 'class-validator';

export class UpdateChapterDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
