import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { AppLoggerService } from '../logger/app-logger.service';

/**
 * Redis Service - Direct KeyvRedis wrapper for caching operations
 * Provides simple get/set/del methods for storing data in Upstash Redis
 * All keys are prefixed with namespace: 'notification-system:'
 */
@Injectable()
export class RedisService {
  private keyvStore: KeyvRedis<string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(RedisService.name);
    this.initializeStore();
  }

  /**
   * Initialize the KeyvRedis store with Upstash connection
   */
  private initializeStore(): void {
    const redisUrl = this.configService.get<string>('redis.url') || '';

    if (!redisUrl) {
      throw new Error('Missing Redis URL configuration (redis.url)');
    }

    this.logger.log(
      `[RedisService] Initializing with URL: ${redisUrl.substring(0, 50)}...`,
    );

    try {
      // Create KeyvRedis store with namespace
      this.keyvStore = new KeyvRedis(redisUrl, {
        namespace: 'notification-system',
      });

      this.logger.log('[RedisService] ✅ Redis store initialized');
    } catch (error) {
      this.logger.error('[RedisService] Failed to initialize store', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Set a key-value pair in Redis with optional TTL
   * @param key The cache key (KeyvRedis automatically adds namespace prefix)
   * @param value The value to store (will be JSON stringified if not string)
   * @param ttl Time-to-live in milliseconds (optional)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      // KeyvRedis automatically prefixes with namespace 'notification-system:'
      /* eslint-disable @typescript-eslint/no-unsafe-argument */
      await this.keyvStore.set(key, value, ttl);
      /* eslint-enable @typescript-eslint/no-unsafe-argument */
      this.logger.log(`[RedisService] ✅ Set ${key} (TTL: ${ttl || 'none'})`);
    } catch (error) {
      this.logger.error(`[RedisService] Failed to set key ${key}`, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get a value from Redis by key
   * @param key The cache key (KeyvRedis automatically adds namespace prefix)
   * @returns The stored value or null if not found
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      // KeyvRedis automatically prefixes with namespace 'notification-system:'
      const value = await this.keyvStore.get(key);

      if (value) {
        this.logger.log(`[RedisService] ✅ Retrieved ${key}`);
      } else {
        this.logger.log(`[RedisService] ⚠️ Key not found: ${key}`);
      }
      return (value as T) || null;
    } catch (error) {
      this.logger.error(`[RedisService] Failed to get key ${key}`, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete a key from Redis
   * @param key The cache key (KeyvRedis automatically adds namespace prefix)
   */
  async del(key: string): Promise<void> {
    try {
      // KeyvRedis automatically prefixes with namespace 'notification-system:'
      await this.keyvStore.delete(key);
      this.logger.log(`[RedisService] ✅ Deleted ${key}`);
    } catch (error) {
      this.logger.error(`[RedisService] Failed to delete key ${key}`, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Test connection to Redis
   */
  async testConnection(): Promise<boolean> {
    try {
      const testKey = `test-connection`;
      const testValue = `test-${Date.now()}`;

      // KeyvRedis automatically prefixes with namespace 'notification-system:'
      await this.keyvStore.set(testKey, testValue, 60000);
      const retrieved = await this.keyvStore.get(testKey);

      if (retrieved === testValue) {
        this.logger.log('[RedisService] ✅ Connection test passed');
        return true;
      } else {
        this.logger.warn('[RedisService] ⚠️ Connection test: set/get mismatch');
        return false;
      }
    } catch (error) {
      this.logger.error('[RedisService] Connection test failed', {
        error: (error as Error).message,
      });
      return false;
    }
  }
}
