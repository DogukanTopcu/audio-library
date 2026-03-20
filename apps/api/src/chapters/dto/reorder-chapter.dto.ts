import { IsInt, Min } from 'class-validator';

export class ReorderChapterDto {
  @IsInt()
  @Min(0)
  orderIndex: number;
}
