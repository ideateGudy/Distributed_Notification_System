import { IsString, IsNumber, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({
    example: 'email_verification',
    description: 'Unique identifier code for the template',
  })
  @IsString()
  template_code: string;

  @ApiProperty({
    example: 1,
    description: 'Version number of the template',
  })
  @IsNumber()
  version: number;

  @ApiProperty({
    example: 'Verify Your Email Address',
    description: 'Email subject or notification title',
  })
  @IsString()
  subject: string;

  @ApiProperty({
    example: 'Click the link below to verify your email: {link}',
    description:
      'Email body or notification content (supports template variables)',
  })
  @IsString()
  body: string;

  @ApiProperty({
    example: 'en',
    description: 'Language code for the template (e.g., en, fr, es)',
  })
  @IsString()
  language: string;
}

export class RenderTemplateDto {
  @ApiProperty({
    example: 'email_verification',
    description: 'Unique identifier code for the template',
  })
  @IsString()
  template_code: string;

  @ApiProperty({
    example: 1,
    description: 'Version number of the template',
  })
  @IsNumber()
  version: number;

  @ApiProperty({
    example: {
      additionalProp1: 'string',
      additionalProp2: 'string',
      additionalProp3: 'string',
    },
    description:
      'Object containing template variables to be substituted in the template body. Keys can be any string representing variable names.',
    required: false,
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;
}
