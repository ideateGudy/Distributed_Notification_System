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
  Logger,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { v4 as uuidv4 } from 'uuid';
import { TrackNotificationDto } from './dto/track-notification.dto';

@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(JwtAuthGuard)
  @Post('send')
  @HttpCode(HttpStatus.ACCEPTED) // 202 Accepted is correct for async jobs
  async sendNotification(
    @Body() sendNotificationDto: SendNotificationDto,
    @Req() req: any, // req.user is populated by JwtAuthGuard
    @Headers('X-Request-Id') requestId: string,
    @Headers('X-Correlation-Id') correlationId: string,
  ) {
    this.logger.log(`[${correlationId}] Received notification request...`);

    // Ensure idempotency and correlation IDs
    const idempotentKey = requestId || uuidv4();
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const corrId = correlationId || req.correlationId; // From our middleware

    // The guard adds `user` to the request
    const requestingUser = req.user;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const result = await this.notificationService.processNotificationRequest({
      dto: sendNotificationDto,
      requestingUser,
      idempotentKey,
      correlationId: corrId,
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
   * As per description: "Tracks notification status"
   */
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getNotificationStatus(
    @Query() query: TrackNotificationDto,
    @Headers('X-Correlation-Id') correlationId: string,
    @Req() req: any,
  ) {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const corrId = correlationId || req.correlationId;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

    this.logger.log(
      `[${corrId}] Received status check for ${query.notificationId}`,
    );

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
}
