import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Headers,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import {
  NotificationType,
  SendNotificationDto,
} from './dto/send-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { v4 as uuidv4 } from 'uuid';
import { TrackNotificationDto } from './dto/track-notification.dto';
import { UpdateNotificationStatusDto } from './dto/update-notification-status.dto';
import { AppLoggerService } from '../logger/app-logger.service';

@Controller()
@ApiTags('Notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(NotificationController.name);
  }

  /**
   * POST /api/v1/notifications
   * Send a new notification request (with JWT authentication)
   */
  @UseGuards(JwtAuthGuard)
  @Post('notifications')
  @HttpCode(HttpStatus.ACCEPTED) // 202 Accepted is correct for async jobs
  @ApiBearerAuth('JWT')
  @ApiHeader({
    name: 'X-Request-Id',
    description:
      'Request ID for idempotency (optional, auto-generated if not provided)',
    required: false,
  })
  @ApiBody({
    type: SendNotificationDto,
    examples: {
      email: {
        summary: 'Email Notification',
        value: {
          notification_type: 'email',
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          template_code: 'email_verification',
          variables: {
            name: 'John Doe',
            link: 'https://example.com/verify?token=abc123',
            meta: { verification_code: '123456' },
          },
          request_id: '550e8400-e29b-41d4-a716-446655440001',
          priority: 1,
          metadata: { campaign_id: 'camp_123', source: 'website' },
        },
      },
      push: {
        summary: 'Push Notification',
        value: {
          notification_type: 'push',
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user@example.com',
          template_code: 'welcome_push',
          variables: {
            name: 'Jane Smith',
            link: 'https://example.com/app/home',
          },
          priority: 2,
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Send a notification',
    description: 'Submit a new notification request for processing',
  })
  @ApiResponse({
    status: 202,
    description: 'Notification accepted for processing',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'User service unavailable or user not found',
    schema: {
      example: {
        success: false,
        message: 'User service unavailable or user not found',
        error: 'NOT_FOUND',
      },
    },
  })
  async sendNotification(
    @Body() sendNotificationDto: SendNotificationDto,
    @Req() req: any, // req.user is populated by JwtAuthGuard
    @Headers('X-Request-Id') requestId: string,
  ) {
    // Ensure idempotency key
    const idempotentKey = requestId || uuidv4();
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const requestingUser = req.user;
    // Attach the raw JWT (if present) to the requestingUser so downstream
    // services can forward it when calling other internal services.
    // req.user is populated by JwtAuthGuard (decoded payload). The original
    // token is available on the request headers (Authorization).
    const rawAuthHeader =
      req &&
      req.headers &&
      (req.headers.authorization || req.headers.Authorization);
    if (rawAuthHeader) {
      // rawAuthHeader may be 'Bearer <token>' — strip the prefix
      const parts = String(rawAuthHeader).split(' ');
      requestingUser.jwt = parts.length > 1 ? parts[1] : parts[0];
    }

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const result = await this.notificationService.processNotificationRequest({
      dto: sendNotificationDto,
      requestingUser,
      idempotentKey,
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    return {
      message: 'Notification accepted for processing',
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      data: result,
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    };
  }

  /**
   * GET /api/v1/notifications/status
   * Track notification status (with JWT authentication)
   * Must come before the POST with :notification_preference to avoid route conflicts
   */
  @UseGuards(JwtAuthGuard)
  @Get('notifications/status')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get notification status',
    description: 'Track the status of a specific notification',
  })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationStatus(@Query() query: TrackNotificationDto) {
    this.logger.log(`Status check for ${query.notificationId}`);

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const data = await this.notificationService.getNotificationStatus(
      query.notificationId,
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    return {
      message: 'Status retrieved successfully',
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      data,
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    };
  }

  /**
   * GET /api/v1/{notification_preference}/status
   * Get all notifications of a specific type for the current user (with pagination)
   * Examples:
   *   GET /api/v1/email/status?page=1&limit=10
   *   GET /api/v1/push/status?page=1&limit=10
   * JWT authentication required
   */
  @UseGuards(JwtAuthGuard)
  @Get(':notification_preference/status')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination (optional, defaults to 1)',
    required: false,
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page (optional, defaults to 10)',
    required: false,
    example: 10,
    type: Number,
  })
  @ApiOperation({
    summary: 'Get notifications by type',
    description:
      'Retrieve all notifications of a specific type for the current user with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationsByType(
    @Param('notification_preference') notificationType: NotificationType,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() req: any,
  ) {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const userId = req.user?.user_id as string;
    this.logger.log(
      `[NotificationController] Fetching ${notificationType} notifications for user ${userId} (page ${page}, limit ${limit})`,
    );
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    const result = await this.notificationService.getNotificationsByType(
      userId,
      notificationType,
      page,
      limit,
    );

    this.logger.log(
      `Retrieved ${result.data.length} ${notificationType} notifications for user ${userId}`,
    );

    return {
      success: true,
      message: `Retrieved ${notificationType} notifications for current user`,
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * POST /api/v1/{notification_preference}/status
   * Update notification status (called by consumer services - Email, Push, SMS, etc.)
   * Examples:
   *   POST /api/v1/email/status
   *   POST /api/v1/push/status
   *   POST /api/v1/sms/status
   * No authentication required for internal service-to-service communication.
   */
  @Post(':notification_preference/status')
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    type: UpdateNotificationStatusDto,
    examples: {
      delivered: {
        summary: 'Notification Delivered',
        value: {
          notification_id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'delivered',
          timestamp: '2025-11-12T10:30:00Z',
        },
      },
      failed: {
        summary: 'Notification Failed',
        value: {
          notification_id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'failed',
          timestamp: '2025-11-12T10:30:00Z',
          error: 'SMTP server connection timeout',
        },
      },
      pending: {
        summary: 'Notification Pending',
        value: {
          notification_id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Update notification status',
    description:
      'Update the status of a notification (called by consumer services)',
  })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateNotificationStatus(
    @Body() updateStatusDto: UpdateNotificationStatusDto,
    @Param('notification_preference') notificationPreference: NotificationType,
  ) {
    this.logger.log(
      `Status update: ${updateStatusDto.notification_id} → ${updateStatusDto.status} (${notificationPreference})`,
    );

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const data = await this.notificationService.updateNotificationStatus(
      updateStatusDto.notification_id,
      updateStatusDto.status,
      updateStatusDto.timestamp,
      updateStatusDto.error,
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    return {
      success: true,
      message: `Notification status updated to ${updateStatusDto.status}`,
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      data,
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    };
  }
}
