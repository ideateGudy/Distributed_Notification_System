import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RateLimiterRes, RateLimiterMemory } from 'rate-limiter-flexible';
import { appLogger } from '../../modules/logger/winston.config';

/**
 * Rate Limiter Guard
 * Uses rate-limiter-flexible to enforce API rate limits
 * Can be applied globally or to specific routes/controllers
 */
@Injectable()
export class RateLimiterGuard implements CanActivate {
  private rateLimiter: RateLimiterMemory;

  constructor() {
    // Initialize in-memory rate limiter
    // 100 requests per 15 minutes (900 seconds) per IP
    this.rateLimiter = new RateLimiterMemory({
      points: 100, // Number of requests allowed
      duration: 900, // Time window in seconds (15 minutes)
      blockDuration: 0, // Block until window expires
    });
  }

  /**
   * Activate guard - check rate limit for incoming request
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Extract client IP address
    const clientIp =
      (request.ip as string) ||
      (request.headers['x-forwarded-for']?.split(',')[0]?.trim() as string) ||
      (request.socket?.remoteAddress as string) ||
      'unknown';

    try {
      // Consume one point from the rate limiter for this IP
      const rateLimiterRes: RateLimiterRes =
        await this.rateLimiter.consume(clientIp);

      // Calculate safe reset time - ensure msBeforeNext is a valid number
      const msBeforeNext = Math.max(0, rateLimiterRes.msBeforeNext || 0);
      const resetTime = new Date(Date.now() + msBeforeNext).toISOString();

      // Set rate limit headers
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      response.header('X-RateLimit-Limit', '100');
      response.header(
        'X-RateLimit-Remaining',
        Math.round(rateLimiterRes.remainingPoints).toString(),
      );
      response.header('X-RateLimit-Reset', resetTime);

      return true;
    } catch (rejRes: any) {
      // Rate limit exceeded
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      const msBeforeNext = Math.max(0, (rejRes.msBeforeNext as number) || 0);
      const retryAfter = Math.ceil(msBeforeNext / 1000);
      const resetAt = new Date(Date.now() + msBeforeNext).toISOString();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      response.header('X-RateLimit-Limit', '100');
      response.header('X-RateLimit-Remaining', '0');
      response.header('X-RateLimit-Reset', resetAt);
      response.header('Retry-After', retryAfter.toString());

      appLogger.warn('Rate limit exceeded', { clientIp, retryAfter });
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */

      throw new HttpException(
        {
          success: false,
          message: `Too many requests. Please retry after ${retryAfter} seconds.`,
          error: 'RATE_LIMIT_EXCEEDED',
          meta: {
            retryAfter,
            resetAt,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
