import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsObject,
  IsIn,
  IsOptional,
} from 'class-validator';

export class SendNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  readonly userId: string;

  @IsIn(['email', 'push'])
  @IsNotEmpty()
  readonly type: 'email' | 'push';

  @IsString()
  @IsNotEmpty()
  readonly templateId: string;

  @IsObject()
  @IsOptional()
  readonly variables?: Record<string, any>;
}
