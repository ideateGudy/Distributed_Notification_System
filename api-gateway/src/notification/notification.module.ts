import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    // HTTP Client
    HttpModule,

    // Connect to RabbitMQ Client
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_MQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService): any => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('rabbitmq.url') || ''],
            exchange: configService.get<string>('rabbitmq.exchange') || '',
            exchangeType: 'direct',
            noAck: true, // Fire and forget (queue handles persistence)
          },
        }),
      },
    ] as any),
    /* eslint-enable @typescript-eslint/no-unsafe-argument */

    // Connect to Redis (for idempotency and status tracking)
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get<string>('redis.url'),
      }),
    } as any),
    /* eslint-enable @typescript-eslint/no-unsafe-argument */
  ],
  controllers: [NotificationController],
  providers: [],
})
export class NotificationModule {}
