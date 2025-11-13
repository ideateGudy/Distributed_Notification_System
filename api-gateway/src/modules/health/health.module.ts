import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TerminusModule,
    HttpModule, // We'll need this to ping other services
    // RedisModule is global, so it's already available via CACHE_MANAGER
  ],
  controllers: [HealthController],
})
export class HealthModule {}
