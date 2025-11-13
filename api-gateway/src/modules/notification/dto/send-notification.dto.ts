import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsObject,
  IsIn,
  IsOptional,
  IsNumber,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
}

/**
 * UserData - Variables passed to the template
 */
export class UserData {
  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'https://example.com/verify?token=abc123',
    description: 'URL link for the notification',
  })
  @IsUrl()
  @IsNotEmpty()
  link: string;

  @ApiProperty({
    example: { key1: 'value1', key2: 'value2' },
    description: 'Additional metadata object',
    required: false,
  })
  @IsObject()
  @IsOptional()
  meta?: Record<string, any>;
}

/**
 * SendNotificationDto - Main notification request body
 * Spec: POST /api/v1/notifications/
 */
export class SendNotificationDto {
  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.EMAIL,
    description: 'Type of notification to send',
  })
  @IsIn([NotificationType.EMAIL, NotificationType.PUSH])
  @IsNotEmpty()
  notification_type: NotificationType;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the user receiving the notification',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user receiving the notification',
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'email_verification',
    description: 'Code/identifier of the template to use',
  })
  @IsString()
  @IsNotEmpty()
  template_code: string;

  @ApiProperty({
    type: UserData,
    description: 'Variables to be substituted in the template',
  })
  @Type(() => UserData)
  @ValidateNested()
  @IsNotEmpty()
  variables: UserData;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Request ID for idempotency (optional)',
    required: false,
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  request_id: string;

  @ApiProperty({
    example: 1,
    description: 'Priority level of the notification (optional)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiProperty({
    example: { campaign_id: 'camp_123', source: 'website' },
    description: 'Additional metadata for tracking (optional)',
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
