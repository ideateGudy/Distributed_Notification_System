import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './modules/health/health.module';
import configuration from './config/config';
import { validate } from './config/config.schema';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationModule } from './modules/notification/notification.module';
import { LoggerModule } from './modules/logger/logger.module';
import { RedisModule } from './modules/redis/redis.module';
import { UserModule } from './modules/user/user.module';
import { TemplateModule } from './modules/template/template.module';
import { RootController } from './common/controllers/root.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
      validate,
    }),
    ScheduleModule.forRoot(),
    HealthModule,
    AuthModule,
    NotificationModule,
    UserModule,
    TemplateModule,
    LoggerModule,
    RedisModule,
  ],
  controllers: [RootController],
  providers: [],
})
export class AppModule {}
