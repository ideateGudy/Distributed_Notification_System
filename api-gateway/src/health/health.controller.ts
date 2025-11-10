import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  /* eslint-disable @typescript-eslint/no-unsafe-call */
  @HealthCheck()
  /* eslint-enable @typescript-eslint/no-unsafe-call */
  /* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
  check() {
    return this.health.check([
      // Check internal memory (heap and RSS)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),

      // Ping internal services (synchronous dependencies)
      // These will fail until the services are running
      () =>
        this.http.pingCheck(
          'user_service',
          `${this.configService.get('services.user')}/health`,
        ),
      () =>
        this.http.pingCheck(
          'template_service',
          `${this.configService.get('services.template')}/health`,
        ),
    ]);
  }
  /* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
}
