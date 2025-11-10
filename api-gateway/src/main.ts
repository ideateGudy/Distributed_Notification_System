import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from '@fastify/helmet';

// Import custom modules
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { CorrelationMiddleware } from './common/middleware/correlation.middleware';
import { caseConverter } from './common/utils/case-converter';

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

  // Middleware: Attach correlation ID
  app.use(CorrelationMiddleware);

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

  // Add middleware to convert request body keys to camelCase
  // This is necessary because ValidationPipe runs before the DTO is created
  /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
  app.use((req, res, next) => {
    if (req.body) {
      req.body = caseConverter.toCamelCase(req.body);
    }
    if (req.query) {
      req.query = caseConverter.toCamelCase(req.query);
    }
    next();
  });
  /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

  // Global Interceptors: Format successful responses
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global Filters: Format error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Start the API Gateway

  await app.listen(port, '0.0.0.0');

  Logger.log(`🚀 API Gateway running on: http://localhost:${port}`);
}
void bootstrap();
