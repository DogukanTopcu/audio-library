import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChoiceDto {
  @IsInt()
  @Min(0)
  choiceIndex: number;

  @IsUUID()
  audioRecordId: string;

  @IsOptional()
  @IsString()
  choiceText?: string;
}

export class CreateQuestionDto {
  @IsUUID()
  audioRecordId: string;

  @IsOptional()
  @IsUUID()
  explanationAudioRecordId?: string;

  @IsUUID()
  chapterId: string;

  @IsInt()
  @Min(0)
  correctChoiceIndex: number;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChoiceDto)
  choices: CreateChoiceDto[];
}
