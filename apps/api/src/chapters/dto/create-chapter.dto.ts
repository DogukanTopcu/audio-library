import { IsString, IsOptional, IsUUID, IsInt, Min } from 'class-validator';

export class CreateChapterDto {
  @IsUUID()
  contentId: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
