import { IsString, IsInt, IsBoolean, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsString()
  audioRecordId: string;

  @IsInt()
  @Min(0)
  positionSeconds: number;

  @IsBoolean()
  isCompleted: boolean;
}
