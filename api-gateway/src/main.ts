import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from '@fastify/helmet';
import { appLogger } from './modules/logger/winston.config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// Import custom modules
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { caseConverter } from './common/utils/case-converter';
import { RateLimiterGuard } from './common/guards/rate-limiter.guard';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: true,
    }),
  );

  const configService = app.get(ConfigService);

  const port = configService.get<number>('port', 3000);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  await app.register(helmet as any, {
    contentSecurityPolicy: false,
  });
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  // Add middleware to convert request body keys to camelCase
  // This MUST be before ValidationPipe to work properly
  /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
  app.use((req: any, res: any, next: any) => {
    if (req.body && typeof req.body === 'object') {
      req.body = caseConverter.toCamelCase(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = caseConverter.toCamelCase(req.query);
    }
    next();
  });
  /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      // Add a transformer to convert incoming snake_case keys to camelCase
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (error) =>
            `${error.constraints ? Object.values(error.constraints).join('. ') : 'Unknown error'}`,
        );
        return new BadRequestException(messages.join(', '));
      },
    }),
  );

  // Global Guards: Rate Limiting
  // Enforces 100 requests per 15 minutes per IP address
  app.useGlobalGuards(new RateLimiterGuard());

  // Global Interceptors: Format successful responses
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global Filters: Format error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger Setup

  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription(
      'Distributed Notification System - API Gateway\n\nMain entry point for all microservices',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('Root', 'Root API endpoint')
    .addTag('Health', 'Health check endpoints')
    .addTag('Notifications', 'Notification management endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Templates', 'Template management endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  // Start the API Gateway

  await app.listen(port, '0.0.0.0');

  appLogger.info(`🚀 API Gateway running on: http://localhost:${port}`);
}
void bootstrap();
