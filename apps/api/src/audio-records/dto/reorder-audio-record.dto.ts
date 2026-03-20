import { IsInt, Min } from 'class-validator';

export class ReorderAudioRecordDto {
  @IsInt()
  @Min(0)
  orderIndex: number;
}
