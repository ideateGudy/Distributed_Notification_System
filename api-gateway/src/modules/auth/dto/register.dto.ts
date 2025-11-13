import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PreferencesDto {
  @IsBoolean()
  @ApiProperty({
    example: true,
    description: 'Whether the user wants to receive email notifications',
  })
  email: boolean;

  @IsBoolean()
  @ApiProperty({
    example: false,
    description: 'Whether the user wants to receive push notifications',
  })
  push: boolean;
}

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({
    example: 'securePassword123',
    description: 'User password (minimum 8 characters)',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  name: string;

  // preferences are optional, but when present must include email/push booleans
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesDto)
  @ApiProperty({
    type: PreferencesDto,
    required: false,
    description: 'User notification preferences',
  })
  preferences?: PreferencesDto;
}
