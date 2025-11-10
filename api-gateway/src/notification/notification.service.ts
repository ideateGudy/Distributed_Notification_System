import {
  Inject,
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { SendNotificationDto } from './dto/send-notification.dto';

interface ProcessParams {
  dto: SendNotificationDto;
  requestingUser: any; // User from JWT
  idempotentKey: string;
  correlationId: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // URLs for synchronous internal REST calls
  private readonly userServiceUrl: string;
  private readonly templateServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject('NOTIFICATION_MQ_CLIENT') private readonly mqClient: ClientProxy,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.userServiceUrl = this.configService.get<string>('services.user') || '';
    this.templateServiceUrl =
      this.configService.get<string>('services.template') || '';
  }

  /**
   * Main processing function. Orchestrates all steps.
   */
  async processNotificationRequest(params: ProcessParams) {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const { dto, idempotentKey, correlationId, requestingUser } = params;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    const logPrefix = `[${correlationId}]`;

    // 1. Idempotency Check
    const idempotentResponse = await this.redis.get(
      `idempotency:${idempotentKey}`,
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
      type: dto.type,
      recipient_id: dto.userId,
      template_id: dto.templateId,
      submitted_at: new Date().toISOString(),
      correlation_id: correlationId,
    };

    // Store initial status (for /status endpoint) & idempotency key
    // Set a TTL (Time To Live) - 24 hours
    const pipeline = this.redis.pipeline();
    pipeline.set(
      `status:${notificationId}`,
      JSON.stringify(initialStatus),
      'EX',
      86400,
    );
    pipeline.set(
      `idempotency:${idempotentKey}`,
      JSON.stringify(initialStatus),
      'EX',
      86400,
    );
    await pipeline.exec();

    try {
      // 2. Sync Call: Get User Data (Auth/Preferences/Contact)
      // We pass the auth token from the original request to the User service
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      const authHeader = `Bearer ${requestingUser.jwt}`; // Assuming JWT is on user
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      const user = await this.getUserData(
        dto.userId,
        correlationId,
        authHeader,
      );

      // 3. Sync Call: Get Template Data
      const template = await this.getTemplateData(
        dto.templateId,
        correlationId,
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */

      // 4. Logic: Check preferences (example)
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      if (dto.type === 'email' && !user.preferences.allow_emails) {
        throw new HttpException(
          'User has disabled email notifications',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (dto.type === 'push' && !user.preferences.allow_push) {
        throw new HttpException(
          'User has disabled push notifications',
          HttpStatus.BAD_REQUEST,
        );
      }
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */

      // 5. Build Message Payload
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
      const messagePayload = {
        notification_id: notificationId,
        correlation_id: correlationId,
        template_body: template.body, // The template itself
        template_subject: template.subject,
        user_contact: {
          email: user.email,
          push_token: user.push_token,
        },
        variables: dto.variables,
      };
      /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

      // 6. Route to correct queue (using routing key)
      const routingKey = dto.type === 'email' ? 'email.queue' : 'push.queue';

      // Fire and forget
      this.mqClient.emit(routingKey, messagePayload);
      this.logger.log(
        `${logPrefix} Job ${notificationId} sent to queue: ${routingKey}`,
      );

      return initialStatus;
    } catch (error) {
      // Rollback idempotency key on failure to allow retry
      const pipeline = this.redis.pipeline();
      pipeline.del(`idempotency:${idempotentKey}`);
      pipeline.set(
        `status:${notificationId}`,
        JSON.stringify({
          ...initialStatus,
          status: 'failed',
          error: (error as Error).message,
        }),
        'EX',
        86400,
      );
      await pipeline.exec();

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
   * Tracks notification status by querying the shared store (Redis).
   */
  async getNotificationStatus(notificationId: string) {
    const statusData = await this.redis.get(`status:${notificationId}`);
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

  // --- Private Helper Methods for Sync Calls ---

  private async getUserData(
    userId: string,
    correlationId: string,
    authHeader: string,
  ) {
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/api/v1/users/${userId}`, {
          headers: {
            'X-Correlation-Id': correlationId,
            Authorization: authHeader, // Forward the auth
          },
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      // Assuming User service returns { success: true, data: { ... } }
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
      return data.data;
      /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
    } catch (error) {
      this.logger.error(
        `Failed to fetch user data for ${userId}: ${(error as Error).message}`,
      );
      throw new HttpException(
        'User service unavailable or user not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async getTemplateData(templateId: string, correlationId: string) {
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.templateServiceUrl}/api/v1/templates/${templateId}`,
          {
            headers: { 'X-Correlation-Id': correlationId },
          },
        ),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      // Assuming Template service returns { success: true, data: { ... } }
      /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
      return data.data;
      /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
    } catch (error) {
      this.logger.error(
        `Failed to fetch template ${templateId}: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Template service unavailable or template not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
