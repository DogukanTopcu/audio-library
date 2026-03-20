import { IsString, IsOptional, IsUUID, IsInt, Min, IsIn } from 'class-validator';

export class CreateAudioRecordDto {
  @IsUUID()
  chapterId: string;

  @IsString()
  title: string;

  @IsIn(['TOPIC_INTRO', 'QUESTION', 'EXPLANATION', 'STORY_PASSAGE', 'OTHER'])
  type: 'TOPIC_INTRO' | 'QUESTION' | 'EXPLANATION' | 'STORY_PASSAGE' | 'OTHER';

  @IsString()
  bucketKey: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
