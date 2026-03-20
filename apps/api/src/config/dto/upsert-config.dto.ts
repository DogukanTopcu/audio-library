import { IsString, IsIn, IsObject } from 'class-validator';

export class UpsertConfigDto {
  @IsIn(['LANDING', 'PLAYER', 'AGENT', 'LEGAL'])
  section: 'LANDING' | 'PLAYER' | 'AGENT' | 'LEGAL';

  @IsObject()
  updates: Record<string, any>;
}
