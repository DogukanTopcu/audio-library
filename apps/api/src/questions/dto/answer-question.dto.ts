import { IsUUID, IsNumber, IsInt, Min, IsOptional } from 'class-validator';

export class AnswerQuestionDto {
  @IsUUID()
  questionId: string;

  @IsInt()
  @Min(0)
  selectedChoiceIndex: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentSeconds?: number;
}

