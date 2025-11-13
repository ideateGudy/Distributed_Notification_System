import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationStatus {
  DELIVERED = 'delivered',
  PENDING = 'pending',
  FAILED = 'failed',
}

export class UpdateNotificationStatusDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the notification to update',
    format: 'uuid',
  })
  @IsUUID()
  notification_id: string;

  @ApiProperty({
    enum: NotificationStatus,
    example: NotificationStatus.DELIVERED,
    description: 'New status of the notification',
  })
  @IsEnum(NotificationStatus)
  status: NotificationStatus;

  @ApiProperty({
    example: '2025-11-12T10:30:00Z',
    description: 'Timestamp when the status was updated (optional)',
    required: false,
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  timestamp?: string;

  @ApiProperty({
    example: 'SMTP server connection timeout',
    description: 'Error message if status is failed (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  error?: string;
}
