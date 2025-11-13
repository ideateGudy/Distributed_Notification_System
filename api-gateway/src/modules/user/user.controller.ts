/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreatePushTokenDto } from './dto/create-push-token.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AppLoggerService } from '../logger/app-logger.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@ApiTags('Users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(UserController.name);
  }

  /**
   * GET /api/v1/users
   * Get all users (public)
   */
  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve list of all users',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
  })
  async getAllUsers() {
    try {
      const data = await this.userService.getAllUsers();

      return {
        success: true,
        data,
        message: 'Users fetched successfully',
        meta: {},
      };
    } catch (error) {
      this.logger.error(`[Failed to fetch users: ${(error as Error).message}`);
      return {
        success: false,
        error: (error as Error).message,
        message: 'Failed to fetch users',
        meta: {},
      };
    }
  }

  /**
   * GET /api/v1/users/me
   * Get current authenticated user
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get current authenticated user',
    description: 'Retrieve the currently authenticated user profile',
  })
  @ApiResponse({ status: 200, description: 'Current user retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Req() req: any) {
    try {
      const requestingUser = req.user?.user_id;
      this.logger.log(`[${requestingUser}] Fetching current user`);

      const data = await this.userService.getCurrentUser(requestingUser);
      return {
        success: true,
        data,
        message: 'Current user fetched successfully',
        meta: {},
      };
    } catch (error) {
      this.logger.error(
        `[Failed to fetch current user: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message,
        message: 'Failed to fetch current user',
        meta: {},
      };
    }
  }

  /**
   * PATCH /api/v1/users/:user_id
   * Update user information
   */
  @Patch(':user_id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      fullUpdate: {
        summary: 'Update all fields',
        value: {
          email: 'user@example.com',
          password: 'newSecurePassword123',
          name: 'John Doe',
          preferences: { email: false, push: true },
        },
      },
      partialUpdate: {
        summary: 'Update only name and preferences',
        value: {
          name: 'Jane Smith',
          preferences: { email: true, push: false },
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Update user information',
    description:
      'Update user profile details (email, password, name, preferences)',
  })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async updateUser(
    @Param('user_id') user_id: string,
    @Body() dto: UpdateUserDto,
  ) {
    this.logger.log(`Updating user: ${user_id}`);

    const data = await this.userService.updateUser(user_id, dto);

    return {
      success: true,
      data,
      message: 'User updated successfully',
      meta: {},
    };
  }

  /**
   * GET /api/v1/users/:user_id/push-tokens
   * Get all push tokens for a user
   */
  @Get(':user_id/push-tokens')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get all push tokens for a user',
    description: 'Retrieve all push notification tokens associated with a user',
  })
  @ApiResponse({ status: 200, description: 'Push tokens retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPushTokens(@Param('user_id') user_id: string) {
    this.logger.log(`Fetching push tokens for user: ${user_id}`);

    const data = await this.userService.getPushTokens(user_id);

    this.logger.log(
      `Push tokens fetched successfully for user: ${JSON.stringify(data)}`,
    );

    return {
      success: true,
      data,
      message: 'Push tokens fetched successfully',
      meta: {},
    };
  }

  /**
   * POST /api/v1/users/:user_id/push-tokens
   * Create a new push token for a user
   */
  @Post(':user_id/push-tokens')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({
    type: CreatePushTokenDto,
    examples: {
      exponentPush: {
        summary: 'Expo Push Token',
        value: {
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          token: 'ExponentPushToken[abc123def456ghi789jklmno]',
        },
      },
      fcmToken: {
        summary: 'Firebase Cloud Messaging Token',
        value: {
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          token: 'cXpD8vQ1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Create a push token for a user',
    description: 'Register a new push notification token for a user',
  })
  @ApiResponse({ status: 201, description: 'Push token created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPushToken(
    @Param('user_id') user_id: string,
    @Body() dto: CreatePushTokenDto,
  ) {
    try {
      this.logger.log(`Creating push token for user: ${user_id}`);

      const data = await this.userService.createPushToken(user_id, dto.token);

      return {
        success: true,
        data,
        message: 'Push token created successfully',
        meta: {},
      };
    } catch (error) {
      this.logger.error(
        `Failed to create push token: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message,
        message: 'Failed to create push token',
        meta: {},
      };
    }
  }
}
