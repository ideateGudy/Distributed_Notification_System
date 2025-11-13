/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { TemplateService } from '../template/template.service';
import { UserService } from '../user/user.service';
import { v4 as uuidv4 } from 'uuid';
import {
  NotificationType,
  SendNotificationDto,
} from './dto/send-notification.dto';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { NotificationStatus } from './dto/update-notification-status.dto';

interface ProcessParams {
  dto: SendNotificationDto;
  requestingUser: any; // User from JWT
  idempotentKey: string;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  // proxies for synchronous internal REST calls

  constructor(
    private readonly rabbit: RabbitMQService,
    private readonly userService: UserService,
    private readonly templateService: TemplateService,
    private readonly logger: AppLoggerService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(NotificationService.name);
  }

  /**
   * Register status update callback on module initialization
   * This callback updates the Redis cache when consumer services publish status updates
   */
  onModuleInit() {
    this.rabbit.onStatusUpdate(async (statusUpdate) => {
      try {
        // Extract notification ID from the status update message
        const { notification_id, status, timestamp, error } = statusUpdate;

        this.logger.log('Processing status update from queue', {
          notification_id,
          status,
          timestamp,
        });

        // Get current status data from Redis
        const currentStatusData = await this.redis.get<string>(
          `status_${notification_id}`,
        );

        if (!currentStatusData) {
          this.logger.warn('Notification not found in cache', {
            notification_id,
          });
          return;
        }

        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        const currentStatus = JSON.parse(currentStatusData);

        // Update status from "queued" to the new status
        const updatedStatus = {
          ...currentStatus,
          status, // Update from "queued" to new status (delivered, failed, processing, bounced, etc)
          updated_at: timestamp || new Date().toISOString(),
          ...(error && { error }), // Include error message if provided
        };

        // Get TTL from config (default: 24 hours)
        const ttl = this.configService.get<number>(
          'redis.keyExpirationMilliseconds',
        );

        // Update Redis cache with new status
        await this.redis.set(
          `status_${notification_id}`,
          JSON.stringify(updatedStatus),
          ttl,
        );

        this.logger.log('Upstash Redis cache updated', {
          notification_id,
          old_status: currentStatus.status,
          new_status: status,
          cache_key: `status_${notification_id}`,
        });
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      } catch (err) {
        this.logger.error('Error updating Redis cache from status update', {
          error: err instanceof Error ? err.message : String(err),
          notification_id: statusUpdate.notification_id,
        });
      }
    });

    this.logger.log('Status update callback registered in NotificationService');
  }
  async processNotificationRequest(params: ProcessParams) {
    const { dto, idempotentKey } = params;

    const logPrefix = `[${uuidv4()}]`;

    const idempotentResponse = await this.redis.get<string>(
      `idempotency_${idempotentKey}`,
    );
    if (idempotentResponse) {
      this.logger.warn(
        `${logPrefix} Duplicate request detected: ${idempotentKey}`,
      );
      /* eslint-disable @typescript-eslint/no-unsafe-return */
      return JSON.parse(idempotentResponse);
      /* eslint-enable @typescript-eslint/no-unsafe-return */
    }

    const notificationId = uuidv4();
    const initialStatus = {
      notification_id: notificationId,
      status: 'queued',
      notification_type: dto.notification_type,
      user_id: dto.user_id,
      recipient: dto.email,
      template_code: dto.template_code,
      submitted_at: new Date().toISOString(),
      request_id: dto.request_id || uuidv4(),
      priority: dto.priority || 0,
      variables: dto.variables,
      metadata: dto.metadata,
    };

    // Store initial status (for /status endpoint) & idempotency key
    // Set a TTL (Time To Live) - 24 hours (86400000 milliseconds)
    const ttl = this.configService.get('redis.keyExpirationMilliseconds'); // TTL in milliseconds
    // Get existing notification IDs for this user
    const userNotificationsKey = `user_${dto.user_id}_notifications`;

    const existingIdsRaw =
      (await this.redis.get<string>(userNotificationsKey)) || '[]';
    const existingIds: string[] = JSON.parse(existingIdsRaw);
    existingIds.push(notificationId);

    await Promise.all([
      this.redis.set(
        `status_${notificationId}`,
        JSON.stringify(initialStatus),
        ttl,
      ),
      this.redis.set(
        `idempotency_${idempotentKey}`,
        JSON.stringify(initialStatus),
        ttl,
      ),
      this.redis.set(userNotificationsKey, JSON.stringify(existingIds), ttl),
    ]);

    try {
      const user = await this.userService.getUser(dto.user_id);

      const template = await this.templateService.getTemplate(
        dto.template_code,
      );

      this.logger.log(
        `${logPrefix} Template ${dto.template_code} data retrieved ${template}`,
      );

      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      const emailAllowed =
        user.preferences?.allow_emails ?? user.preferences?.email ?? false;
      const pushAllowed =
        user.preferences?.allow_push ?? user.preferences?.push ?? false;
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */

      if (dto.notification_type === NotificationType.EMAIL && !emailAllowed) {
        throw new HttpException(
          'User has disabled email notifications',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (dto.notification_type === NotificationType.PUSH && !pushAllowed) {
        throw new HttpException(
          'User has disabled push notifications',
          HttpStatus.BAD_REQUEST,
        );
      }

      const routingKey =
        dto.notification_type === NotificationType.EMAIL
          ? 'email.queue'
          : 'push.queue';

      this.logger.log(
        `${logPrefix} Routing job ${notificationId} to ${routingKey}----------------------`,
      );
      if (routingKey === 'email.queue') {
        const message = {
          request_id: dto.request_id,
          notification_type: 'email',
          user_id: dto.user_id,
          email: dto.email,
          template_code: dto.template_code,
          variables: {
            additionalProp1: {},
          },
          priority: 1,
          metadata: {
            additionalProp1: {},
          },
        };
        this.rabbit.publish(routingKey, message);
        this.logger.log(
          `${logPrefix} Job ${notificationId} sent to queue: ${routingKey}`,
        );
        return initialStatus;
      }

      // Celery-compatible task format for push notifications
      const celeryMessage = {
        request_id: dto.request_id,
        notification_type: 'push',
        user_id: dto.user_id,
        email: dto.email,
        template_code: dto.template_code,
        variables: {
          name: dto.variables?.name || 'User',
          link: dto.variables?.link || 'https://example.com',
          meta: {},
        },
      };

      this.rabbit.publish(routingKey, celeryMessage, {
        contentType: 'application/json',
      });
      this.logger.log(
        `${logPrefix} Job ${notificationId} sent to queue: ${routingKey}`,
      );

      return initialStatus;
    } catch (error) {
      // Rollback idempotency key on failure to allow retry
      await Promise.all([
        this.redis.del(`idempotency_${idempotentKey}`),
        this.redis.set(
          `status_${notificationId}`,
          JSON.stringify({
            ...initialStatus,
            status: 'failed',
            error: (error as Error).message,
          }),
          86400000,
        ),
      ]);

      this.logger.error(
        `${logPrefix} Failed to process request: ${(error as Error).message}`,
        (error as Error).stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to process notification request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Tracks notification status by querying the shared store (Cache).
   */
  async getNotificationStatus(notificationId: string) {
    const statusData = await this.redis.get<string>(`status_${notificationId}`);
    if (!statusData) {
      throw new HttpException(
        'Notification status not found',
        HttpStatus.NOT_FOUND,
      );
    }
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    return JSON.parse(statusData);
    /* eslint-enable @typescript-eslint/no-unsafe-return */
  }

  /**
   * Get all notifications of a specific type for a user with pagination
   * Uses a list stored in cache for the user to track notification IDs
   */
  async getNotificationsByType(
    userId: string,
    notificationType: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // Retrieve list of notification IDs for this user
    const cacheKey = `user_${userId}_notifications`;
    this.logger.log(`Attempting to retrieve cache key: ${cacheKey}`);

    const notificationIdsRaw = (await this.redis.get<string>(cacheKey)) || '[]';
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const notificationIds: string[] = JSON.parse(notificationIdsRaw);
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    this.logger.log(
      `Fetching notifications for user ${userId}: found ${notificationIds.length} total notifications`,
    );
    if (notificationIds.length > 0) {
      this.logger.log(`Notification IDs: ${JSON.stringify(notificationIds)}`);
    }

    const notifications: any[] = [];

    for (const notificationId of notificationIds) {
      const statusData = await this.redis.get<string>(
        `status_${notificationId}`,
      );
      if (statusData) {
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        const notification = JSON.parse(statusData);
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        // Filter by notification type
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        if (notification.notification_type === notificationType) {
          notifications.push(notification);
        }
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      }
    }

    // Calculate pagination
    const total = notifications.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = notifications.slice(startIndex, endIndex);

    this.logger.log(
      `Found ${total} ${notificationType} notifications for user ${userId} (page ${page}/${totalPages})`,
    );

    return {
      data: paginatedNotifications,
      meta: {
        total,
        limit,
        page,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
      },
    };
  }

  /**
   * Updates notification status by external services (consumer confirmation)
   * Called by Email/Push services to confirm delivery or failure
   */
  async updateNotificationStatus(
    notificationId: string,
    status: string,
    timestamp?: string,
    error?: string,
  ) {
    const statusData = await this.redis.get<string>(`status_${notificationId}`);
    if (!statusData) {
      throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
    }

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const currentStatus = JSON.parse(statusData);
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const updatedStatus = {
      ...currentStatus,
      status,
      updated_at: timestamp || new Date().toISOString(),
      ...(error && { error }),
    };
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    // Update in Cache with 24-hour TTL
    await this.redis.set(
      `status_${notificationId}`,
      JSON.stringify(updatedStatus),
      86400000,
    );

    this.logger.log(`Status updated for ${notificationId}: ${status}`);

    /* eslint-disable @typescript-eslint/no-unsafe-return */
    return updatedStatus;
    /* eslint-enable @typescript-eslint/no-unsafe-return */
  }

  /**
   * TEST ENDPOINT: Emit a status update to the queue
   * This is used to test the status listener and callback system
   * Producer: POST endpoint (simulating consumer services)
   * Consumer: RabbitMQ status listener in RabbitMQService listens on status.queue
   * Routing: Exchange (notifications.direct) + routing_key (status.update) → status.queue
   */
  emitStatusUpdateToQueue(
    notificationId: string,
    status: NotificationStatus,
    timestamp?: string,
    error?: string,
  ) {
    try {
      const statusUpdate = {
        notification_id: notificationId,
        status,
        timestamp: timestamp || new Date().toISOString(),
        ...(error && { error }),
      };

      this.logger.log('Emitting status update to queue', {
        notification_id: notificationId,
        status,
      });

      // Publish to the status.update routing key
      // Exchange: notifications.direct (routing type: direct)
      // Binding: status.update routing_key → status.queue
      // The listener consumes from status.queue
      this.rabbit.publish('status.update', statusUpdate);

      this.logger.log('Status update emitted to queue', {
        notification_id: notificationId,
        routing_key: 'status.update',
        destination_queue: 'status.queue',
      });

      return statusUpdate;
    } catch (err) {
      this.logger.error('Failed to emit status update to queue', {
        error: err instanceof Error ? err.message : String(err),
        notification_id: notificationId,
      });
      throw new HttpException(
        'Failed to emit status update',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // --- Note ---
  // Synchronous HTTP calls to user/template services are delegated to the
  // `UserService` and `TemplateService` classes. This reduces duplication and
  // centralizes error handling and tracing headers.
}
