import { IsNotEmpty, IsUUID } from 'class-validator';

export class TrackNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  readonly notificationId: string;
}
