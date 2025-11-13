import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { AppLoggerService } from '../logger/app-logger.service';

export interface LoginCredentials {
  email: string;
  password: string;
}
export interface LoginResponseFromUserService {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  preferences?: {
    email: boolean;
    push: boolean;
  };
}

export interface RegisterResponseFromUserService {
  success: boolean;
  data: {
    user_id: string;
  };
  message: string;
  meta: Record<string, any>;
}

@Injectable()
export class AuthService {
  // private readonly logger = new Logger(AuthService.name);
  // private readonly logger = new LoggerModule(AuthService.name);
  private readonly userServiceUrl = process.env.USER_SERVICE_URL;

  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  /**
   * Login user by verifying credentials with user service
   * @param credentials User email and password
   * @returns JWT token if credentials are valid
   */
  async login(
    credentials: LoginCredentials,
  ): Promise<LoginResponseFromUserService> {
    try {
      this.logger.log(`Login attempt for user: ${credentials.email}`);
      // Call user service to authenticate/login and return token
      const response = (await firstValueFrom(
        this.httpService.post(`${this.userServiceUrl}/login`, credentials),
      )) as AxiosResponse<LoginResponseFromUserService>;

      if (response.status !== 200) {
        throw new HttpException(
          {
            success: false,
            message: 'Invalid email or password',
            error: 'Unauthorized',
          },
          response.status,
        );
      }

      // user-service returned 200 — credentials are valid.
      // Create our own JWT for clients instead of forwarding the user-service token.
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      const external = response.data as any;

      // Try to extract a canonical user id from the user-service response when available.
      const access_token = external?.access_token as string;
      const decoded = this.jwtService.decode(access_token);
      const userId = decoded?.user_id as string;
      const email = decoded?.sub as string;

      const payload = {
        sub: email,
        user_id: userId,
      };

      // Use configured JwtModule options (fall back to defaults).
      const myToken = this.jwtService.sign(payload);

      this.logger.log(`User logged in successfully: ${credentials.email}`);

      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

      return {
        user_id: userId,
        email: email,
        access_token: myToken,
        token_type: 'bearer',
      } as LoginResponseFromUserService;
    } catch (error) {
      this.logger.error(`Login failed for user: ${credentials.email}`, error);

      // Handle specific error responses from user service
      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 401) {
        throw new HttpException(
          {
            success: false,
            message: 'Invalid email or password',
            error: 'Unauthorized',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (axiosError.response?.data) {
        throw new HttpException(
          axiosError.response.data,
          axiosError.response.status,
        );
      }

      // Handle connection errors
      throw new HttpException(
        {
          success: false,
          error: 'Failed to authenticate. User service is unavailable.',
          message: 'Service error',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Register a new user by calling the user service
   * @param registerRequest User registration data
   * @returns User-service response (success or failure)
   */
  async register(
    registerRequest: RegisterRequest,
  ): Promise<RegisterResponseFromUserService> {
    try {
      this.logger.log(
        `Registration attempt for user: ${registerRequest.email}`,
      );

      // Call user service to create new user
      const response = (await firstValueFrom(
        this.httpService.post(
          `${this.userServiceUrl}/register`,
          registerRequest,
          { validateStatus: () => true }, // Accept all status codes
        ),
      )) as AxiosResponse<RegisterResponseFromUserService>;

      this.logger.log(`User registered successfully: ${registerRequest.email}`);

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      // If it's already an HttpException, re-throw it
      if (axiosError instanceof HttpException) {
        throw axiosError;
      }

      // Handle network/connection errors
      this.logger.error(
        `Registration failed for user: ${registerRequest.email}`,
        error,
      );
      throw new HttpException(
        {
          success: false,
          error: 'Failed to register user. User service is unavailable.',
          message: 'Service error',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
