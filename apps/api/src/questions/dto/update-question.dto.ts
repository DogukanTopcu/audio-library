import { IsString, IsOptional, IsUUID, IsInt, Min, IsArray, IsIn } from 'class-validator';

export class UpdateQuestionDto {
  @IsOptional()
  @IsUUID()
  audioRecordId?: string;

  @IsOptional()
  @IsUUID()
  explanationAudioRecordId?: string;

  @IsOptional()
  @IsUUID()
  chapterId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  correctChoiceIndex?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD'])
  difficultyLevel?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topicTags?: string[];
}
