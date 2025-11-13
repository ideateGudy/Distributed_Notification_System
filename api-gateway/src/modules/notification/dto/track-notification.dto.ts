import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TrackNotificationDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the notification to track',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  readonly notificationId: string;
}
