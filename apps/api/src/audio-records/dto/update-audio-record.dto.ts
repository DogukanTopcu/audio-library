import { IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';

export class UpdateAudioRecordDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(['TOPIC_INTRO', 'QUESTION', 'EXPLANATION', 'STORY_PASSAGE', 'OTHER'])
  type?: 'TOPIC_INTRO' | 'QUESTION' | 'EXPLANATION' | 'STORY_PASSAGE' | 'OTHER';

  @IsOptional()
  @IsString()
  bucketKey?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
