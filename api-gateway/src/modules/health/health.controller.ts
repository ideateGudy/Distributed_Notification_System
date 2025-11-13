import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
    private configService: ConfigService,
  ) {}

  /**
   * GET /api/v1/health
   * Full health check with memory and downstream service indicators
   */
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Full health check',
    description: 'Checks memory usage and downstream service connectivity',
  })
  @ApiResponse({
    status: 200,
    description: 'All health indicators are healthy',
  })
  @ApiResponse({ status: 503, description: 'Service unhealthy' })
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
          `${this.configService.get('services.userBase')}/health`,
        ),
      () =>
        this.http.pingCheck(
          'template_service',
          `${this.configService.get('services.templateBase')}/health`,
        ),
      () =>
        this.http.pingCheck(
          'email_service',
          `${this.configService.get('services.emailBase')}/health`,
        ),
      () =>
        this.http.pingCheck(
          'push_service',
          `${this.configService.get('services.pushBase')}/health`,
        ),
    ]);
  }

  /**
   * GET /api/v1/health/test
   * Simple test endpoint that always returns 200 OK
   */
  @Get('test')
  @ApiOperation({
    summary: 'Simple health test',
    description: 'Quick health check with system information',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check passed',
    schema: {
      example: {
        success: true,
        message: 'API Gateway health check passed',
        data: {
          timestamp: '2025-11-12T10:30:45.123Z',
          uptime: 1234.56,
          memory: {
            heapUsed: 45,
            heapTotal: 128,
            rss: 95,
          },
        },
        meta: {},
      },
    },
  })
  test() {
    return {
      success: true,
      message: 'API Gateway health check passed',
      data: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
      },
      meta: {},
    };
  }
}
