import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePushTokenDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the user',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({
    example: 'ExponentPushToken[abc123def456ghi789...]',
    description: 'Push notification token from the device',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
