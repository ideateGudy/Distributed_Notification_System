import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { UserModule } from '../user/user.module';
import { TemplateModule } from '../template/template.module';
import { RabbitMQModule } from 'src/modules/rabbitmq/rabbitmq.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    // User service for fetching user data
    UserModule,
    // Template service for fetching/rendering templates
    TemplateModule,
    // Connect to RabbitMQ Client (Publisher only - no queue needed for gateway)
    RabbitMQModule,
    // Connect to Redis Cache (for idempotency and status tracking)
    RedisModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
