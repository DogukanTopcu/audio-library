import { IsArray, IsUUID } from 'class-validator';

export class AssignCategoriesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds: string[];
}
