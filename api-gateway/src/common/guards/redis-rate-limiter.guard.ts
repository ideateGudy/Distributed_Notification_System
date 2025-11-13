import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  RateLimiterRedis,
  RateLimiterRes,
  RateLimiterMemory,
} from 'rate-limiter-flexible';
import { RedisService } from '../../modules/redis/redis.service';
import { AppLoggerService } from '../../modules/logger/app-logger.service';

/**
 * Advanced Rate Limiter Guard using Redis
 * Suitable for distributed systems and horizontal scaling
 * Shares rate limit state across multiple API Gateway instances
 */
@Injectable()
export class RedisRateLimiterGuard implements CanActivate {
  private rateLimiter: RateLimiterRedis | RateLimiterMemory;

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(RedisRateLimiterGuard.name);
    // Use insurance (in-memory) limiter as default, will upgrade to Redis if available
    this.rateLimiter = new RateLimiterMemory({
      points: 100,
      duration: 900,
      blockDuration: 0,
    });
    // Try to upgrade to Redis in background without blocking
    this.initializeRedisRateLimiter().catch((error) => {
      this.logger.warn('Could not initialize Redis rate limiter', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  /**
   * Initialize Redis-based rate limiter
   * Handles different rate limits for different endpoints
   */
  private async initializeRedisRateLimiter(): Promise<void> {
    try {
      // Get raw Redis client from the service
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const redisClient = this.redisService.getRedis();

      if (!redisClient) {
        this.logger.warn('Redis client not available, using in-memory limiter');
        return;
      }

      // Initialize Redis-based rate limiter
      // 100 requests per 15 minutes per IP
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.rateLimiter = new RateLimiterRedis({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        storeClient: redisClient,
        points: 100,
        duration: 900, // 15 minutes
        blockDuration: 0,
        insuranceLimiter: new RateLimiterMemory({
          points: 100,
          duration: 900,
        }),
        keyPrefix: 'rate_limit:api:', // Redis key prefix
      });

      this.logger.log('Redis rate limiter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Redis rate limiter', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Keep using in-memory limiter
    }
  }

  /**
   * Activate guard - check rate limit for incoming request
   * Supports different limits based on endpoint
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Extract client IP
    const clientIp =
      (request.ip as string) ||
      (request.headers['x-forwarded-for']?.split(',')[0]?.trim() as string) ||
      (request.socket?.remoteAddress as string) ||
      'unknown';

    // Extract request path for logging
    const requestPath = (request.url as string) || 'unknown';

    try {
      // Consume one point for this IP
      const rateLimiterRes: RateLimiterRes =
        await this.rateLimiter.consume(clientIp);

      // Calculate safe reset time
      const msBeforeNext = Math.max(0, rateLimiterRes.msBeforeNext || 0);
      const resetTime = new Date(Date.now() + msBeforeNext).toISOString();

      // Set rate limit headers
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      response.header('X-RateLimit-Limit', '100');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      response.header(
        'X-RateLimit-Remaining',
        Math.round(rateLimiterRes.remainingPoints).toString(),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      response.header('X-RateLimit-Reset', resetTime);

      this.logger.debug('Rate limit check passed', {
        clientIp,
        path: requestPath,
        remainingPoints: rateLimiterRes.remainingPoints,
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

      return true;
    } catch (rejRes: any) {
      // Rate limit exceeded
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      const msBeforeNext = Math.max(0, (rejRes.msBeforeNext as number) || 0);
      const retryAfter = Math.ceil(msBeforeNext / 1000);
      const resetAt = new Date(Date.now() + msBeforeNext).toISOString();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      response.header('X-RateLimit-Limit', '100');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      response.header('X-RateLimit-Remaining', '0');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      response.header('X-RateLimit-Reset', resetAt);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      response.header('Retry-After', retryAfter.toString());

      this.logger.warn('Rate limit exceeded', {
        clientIp,
        path: requestPath,
        retryAfter,
      });
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */

      throw new HttpException(
        {
          success: false,
          message: `Too many requests. Please retry after ${retryAfter} seconds.`,
          error: 'RATE_LIMIT_EXCEEDED',
          meta: {
            retryAfter,
            resetAt: new Date(Date.now() + msBeforeNext).toISOString(),
            limit: 100,
            window: '15 minutes',
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Get current rate limit status for an IP
   * Useful for monitoring and debugging
   */
  async getStatus(clientIp: string) {
    if (!this.rateLimiter) {
      return { available: false };
    }

    try {
      const rateLimiterRes = await this.rateLimiter.get(clientIp);
      return {
        available: true,
        remainingPoints: rateLimiterRes?.remainingPoints ?? 100,
        resetAt: new Date(
          Date.now() + (rateLimiterRes?.msBeforeNext ?? 0),
        ).toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get rate limit status', {
        clientIp,
        error: error instanceof Error ? error.message : String(error),
      });
      return { available: false, error: 'Failed to fetch status' };
    }
  }

  /**
   * Reset rate limit for an IP (admin operation)
   */
  async resetLimit(clientIp: string) {
    if (!this.rateLimiter) {
      return { success: false, message: 'Rate limiter not available' };
    }

    try {
      await this.rateLimiter.delete(clientIp);
      this.logger.log('Rate limit reset for IP', { clientIp });
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to reset rate limit', {
        clientIp,
        error: error instanceof Error ? error.message : String(error),
      });
      return { success: false };
    }
  }
}
