import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AppLoggerService } from '../logger/app-logger.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  // Base URL should point to the user service root. The service appends the /api/v1/users path.
  private base: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: AppLoggerService,
    private readonly configService: ConfigService,
  ) {
    this.base = this.configService.get<string>('services.user')!;
  }

  /**
   * Fetch a user by id.
   */
  async getUser(user_id: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.base}/${user_id}`),
      );

      /* eslint-disable @typescript-eslint/no-unsafe-return */
      return response.data;
      /* eslint-enable @typescript-eslint/no-unsafe-return */
    } catch (error) {
      this.logger.error(
        `Failed to fetch user data for ${user_id}: ${(error as Error).message}`,
      );
      throw new HttpException(
        'User service unavailable or user not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Create a push token for a user
   */
  async createPushToken(user_id: string, token: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.base}/${user_id}/push-tokens`, { token }),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to create push token for ${user_id}: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Failed to create push token',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get all push tokens for a user
   */
  async getPushTokens(user_id: string) {
    try {
      const url = `${this.base}/${user_id}/push-token`;
      this.logger.log(`Fetching push tokens from: ${url}`);
      const response = await firstValueFrom(this.httpService.get(url));
      this.logger.log(
        `Fetched push tokens for user ${user_id} successfully: ${JSON.stringify(response.data)}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch push tokens for user ${user_id}: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Failed to fetch push tokens',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Update user information
   */
  async updateUser(user_id: string, payload: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.base}/${user_id}`, payload),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data;
    } catch (error: any) {
      // If the error is from the remote service (AxiosError), extract status and data
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.response) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const status = error.response.status;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const data = error.response.data;
        this.logger.error(
          `Remote service returned ${status} for user ${user_id}: ${JSON.stringify(data)}`,
        );
        // Re-throw with the remote service's status and details
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        throw new HttpException(data, status);
      }
      // For other errors (network, timeout, etc.)
      this.logger.error(
        `Failed to update user ${user_id}: ${(error as Error).message}`,
      );
      throw new HttpException('Failed to update user', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Get all users
   */
  async getAllUsers() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.base}`),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch all users: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Failed to fetch users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get current user (authenticated)
   */
  async getCurrentUser(user_id: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.base}/${user_id}`),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch current user: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Failed to fetch current user',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
