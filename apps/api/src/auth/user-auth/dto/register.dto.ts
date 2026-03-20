import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsBoolean, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'TC ID must be exactly 11 digits' })
  tc_id: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsString()
  @IsNotEmpty()
  disability_document_key: string;

  @IsBoolean()
  legal_consent: boolean;
}
