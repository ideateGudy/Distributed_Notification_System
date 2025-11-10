import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from '@fastify/helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: true,
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
  const configService = app.get(ConfigService);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  const port = configService.get<number>('port', 3000);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  await app.register(helmet as any, {
    contentSecurityPolicy: false,
  });
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Middlewares

  //Global Pipes:
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

  // Start the API Gateway
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  await app.listen(port, '0.0.0.0');

  Logger.log(`🚀 API Gateway running on: http://localhost:${port}`);
}
void bootstrap();
