import { IsString, IsOptional, IsIn, IsObject } from 'class-validator';

export class CreateContentDto {
  @IsString()
  title: string;

  @IsIn(['TEXTBOOK', 'NOVEL', 'PRACTICE_TEST', 'QUESTION_BANK', 'OTHER'])
  type: 'TEXTBOOK' | 'NOVEL' | 'PRACTICE_TEST' | 'QUESTION_BANK' | 'OTHER';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsString()
  coverImageKey?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
